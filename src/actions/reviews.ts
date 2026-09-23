'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import type { ActionResult } from '@/schemas/admin';

const reviewInput = z.object({
  eventId: z.string().uuid(),
  authorName: z.string().trim().min(1, 'Falta tu nombre.').max(80),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10, 'Cuéntanos un poco más (mínimo 10 letras).').max(1000),
  consent: z.literal(true, { message: 'Necesitamos tu permiso para publicarla.' }),
});

/** Los novios dejan su reseña desde el panel. Una por evento; la publica el equipo. */
export async function submitReview(raw: unknown): Promise<ActionResult> {
  const me = await requireRole('client', 'staff', 'admin');
  const parsed = reviewInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Revisa los campos.' };
  const i = parsed.data;
  const supabase = await supabaseServer();
  const { data: ev } = await supabase.from('events').select('id, type').eq('id', i.eventId).maybeSingle();
  if (!ev) return { ok: false, error: 'Sin acceso a este evento.' };
  const { error } = await supabase.from('reviews').insert({ event_id: ev.id, user_id: me.userId, author_name: i.authorName, city: i.city || null, rating: i.rating, body: i.body, event_type: ev.type });
  if (error) return { ok: false, error: error.code === '23505' ? 'Ya dejaste tu reseña de este evento.' : error.message };
  revalidatePath(`/panel/${ev.id}`);
  return { ok: true };
}

export async function setReviewApproved(reviewId: string, approved: boolean, featured?: boolean): Promise<ActionResult> {
  await requireRole('admin', 'staff');
  const supabase = await supabaseServer();
  const patch: Record<string, unknown> = { approved_at: approved ? new Date().toISOString() : null };
  if (featured !== undefined) patch.featured = featured;
  const { error } = await supabase.from('reviews').update(patch).eq('id', reviewId);
  if (error) return { ok: false, error: error.message };
  revalidateTag('reviews', 'max');
  revalidatePath('/admin/reviews');
  revalidatePath('/');
  revalidatePath('/en');
  return { ok: true };
}

export async function deleteReview(reviewId: string): Promise<ActionResult> {
  await requireRole('admin');
  const supabase = await supabaseServer();
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
  if (error) return { ok: false, error: error.message };
  revalidateTag('reviews', 'max');
  revalidatePath('/admin/reviews');
  return { ok: true };
}
