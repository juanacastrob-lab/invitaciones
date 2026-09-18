'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import type { ActionResult } from '@/schemas/admin';

/**
 * Equipo: solo el admin. Los candados de verdad están en la base
 * (rpc_invite_staff / rpc_set_role): aquí solo se valida el input.
 */

export async function inviteStaff(rawEmail: unknown): Promise<ActionResult> {
  await requireRole('admin');
  const email = z.string().trim().toLowerCase().email().max(200).safeParse(rawEmail);
  if (!email.success) return { ok: false, error: 'Escribe un correo válido.', field: 'email' };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('rpc_invite_staff', { p_email: email.data });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/team');
  const active = (data as { active?: boolean } | null)?.active;
  return { ok: true, message: active ? 'Ya tenía cuenta: desde ahora es parte del equipo.' : 'Invitación lista. En cuanto entre con ese correo, queda como equipo.' };
}

export async function setRole(userId: unknown, role: unknown): Promise<ActionResult> {
  await requireRole('admin');
  const parsed = z.object({ userId: z.string().uuid(), role: z.enum(['staff', 'client']) }).safeParse({ userId, role });
  if (!parsed.success) return { ok: false, error: 'Datos inválidos.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('rpc_set_role', { p_user_id: parsed.data.userId, p_role: parsed.data.role });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/team');
  return { ok: true, message: 'Listo.' };
}

export async function cancelInvite(id: unknown): Promise<ActionResult> {
  await requireRole('admin');
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.from('team_invites').delete().eq('id', parsed.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/team');
  return { ok: true };
}
