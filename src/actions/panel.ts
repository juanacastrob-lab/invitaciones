'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import type { ActionResult } from '@/schemas/admin';

/** Los novios aprueban: la base revisa acceso y que esté en revisión. */
export async function approveEvent(eventId: string): Promise<ActionResult> {
  await requireRole('client', 'staff', 'admin');
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('rpc_approve_event', { p_event_id: eventId });
  if (error) return { ok: false, error: error.message };
  const { data: ev } = await supabase.from('events').select('slug').eq('id', eventId).maybeSingle();
  revalidatePath(`/panel/${eventId}`);
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath('/admin/events');
  if (ev?.slug) revalidatePath(`/i/${ev.slug}`, 'layout');
  return { ok: true };
}
