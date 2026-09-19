'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import type { ActionResult } from '@/schemas/admin';

/** Precios: solo admin (la RLS de packages/extras también lo exige). */

const packageEdit = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  price: z.coerce.number().min(0).max(999999),
  active: z.boolean(),
});

const extraEdit = packageEdit.extend({
  description: z.string().trim().max(300).optional().or(z.literal('')),
});

function bust() {
  revalidateTag('packages', 'max');
  revalidateTag('extras', 'max');
  revalidatePath('/admin/pricing');
  revalidatePath('/');
  revalidatePath('/en');
  revalidatePath('/comprar');
}

export async function updatePackage(raw: unknown): Promise<ActionResult> {
  await requireRole('admin');
  const parsed = packageEdit.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, ...rest } = parsed.data;

  const supabase = await supabaseServer();
  const { error, count } = await supabase.from('packages').update(rest, { count: 'exact' }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: 'No se guardó: solo el admin puede cambiar precios.' };
  await supabase.rpc('log_activity', { p_entity: 'package', p_entity_id: id, p_action: 'update', p_data: rest });
  bust();
  return { ok: true, message: 'Guardado.' };
}

export async function updateExtra(raw: unknown): Promise<ActionResult> {
  await requireRole('admin');
  const parsed = extraEdit.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, description, ...rest } = parsed.data;

  const supabase = await supabaseServer();
  const { error, count } = await supabase.from('extras').update({ ...rest, description: description || null }, { count: 'exact' }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: 'No se guardó: solo el admin puede cambiar precios.' };
  await supabase.rpc('log_activity', { p_entity: 'extra', p_entity_id: id, p_action: 'update', p_data: rest });
  bust();
  return { ok: true, message: 'Guardado.' };
}
