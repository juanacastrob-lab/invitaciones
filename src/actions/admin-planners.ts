'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import type { ActionResult } from '@/schemas/admin';

const plannerInput = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/, 'Código de 4 a 12 letras o números, sin espacios.'),
  commissionPct: z.coerce.number().min(0).max(50),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

/** Alta de planner: solo admin (la RLS también lo exige). */
export async function createPlanner(raw: unknown): Promise<ActionResult> {
  await requireRole('admin');
  const parsed = plannerInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, field: parsed.error.issues[0].path.join('.') };
  const p = parsed.data;
  const supabase = await supabaseServer();
  const { error } = await supabase.from('planners').insert({ name: p.name, email: p.email, phone: p.phone || null, code: p.code, commission_pct: p.commissionPct, notes: p.notes || null });
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Ese correo o código ya existe.' };
    return { ok: false, error: error.message };
  }
  revalidatePath('/admin/planners');
  return { ok: true, message: 'Planner dado de alta.' };
}

export async function updatePlanner(id: unknown, raw: unknown): Promise<ActionResult> {
  await requireRole('admin');
  const pid = z.string().uuid().safeParse(id);
  const parsed = plannerInput.extend({ active: z.boolean() }).safeParse(raw);
  if (!pid.success || !parsed.success) return { ok: false, error: parsed.success ? 'Datos inválidos.' : parsed.error.issues[0].message };
  const p = parsed.data;
  const supabase = await supabaseServer();
  const { error, count } = await supabase.from('planners').update({ name: p.name, email: p.email, phone: p.phone || null, code: p.code, commission_pct: p.commissionPct, notes: p.notes || null, active: p.active }, { count: 'exact' }).eq('id', pid.data);
  if (error) return { ok: false, error: error.code === '23505' ? 'Ese correo o código ya existe.' : error.message };
  if (!count) return { ok: false, error: 'No se guardó.' };
  revalidatePath('/admin/planners');
  return { ok: true, message: 'Guardado.' };
}

export async function setCommissionPaid(orderId: unknown, paid: boolean): Promise<ActionResult> {
  await requireRole('admin');
  const oid = z.string().uuid().safeParse(orderId);
  if (!oid.success) return { ok: false, error: 'Datos inválidos.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('rpc_mark_commission_paid', { p_order_id: oid.data, p_paid: paid });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/planners');
  revalidatePath('/panel/comisiones');
  return { ok: true };
}
