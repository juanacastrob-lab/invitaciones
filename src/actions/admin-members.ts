'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import type { ActionResult } from '@/schemas/admin';

/** Liga el correo de los novios al evento. Si aún no tienen cuenta, se liga solo cuando entren. */
export async function addMember(eventId: string, email: string): Promise<ActionResult<{ linked: boolean }>> {
  await requireRole('admin', 'staff');
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('rpc_add_event_member', { p_event_id: eventId, p_email: email });
  if (error) return { ok: false, error: error.message };
  const r = data as { ok: boolean; error?: string; linked?: boolean };
  if (!r.ok) return { ok: false, error: r.error === 'email_invalid' ? 'Ese correo no parece válido.' : 'No se pudo agregar.' };
  revalidatePath(`/admin/events/${eventId}`);
  return {
    ok: true,
    data: { linked: Boolean(r.linked) },
    message: r.linked ? 'Listo: ya tiene acceso.' : 'Listo: tendrá acceso en cuanto entre con ese correo.',
  };
}

export async function removeMember(eventId: string, inviteId: string): Promise<ActionResult> {
  await requireRole('admin', 'staff');
  const supabase = await supabaseServer();
  const { error } = await supabase.from('event_member_invites').delete().eq('id', inviteId).eq('event_id', eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/events/${eventId}`);
  return { ok: true };
}
