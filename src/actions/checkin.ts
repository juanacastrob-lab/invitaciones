'use server';

import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';

export interface CheckinGuest {
  id: string;
  display_name: string;
  passes: number;
  status: 'pending' | 'confirmed' | 'declined';
  confirmed_count: number;
  table_no: string | null;
  group_tag: string | null;
  checked_in_at: string | null;
  checked_in_count: number;
}

export type CheckinResult =
  | { ok: true; already: boolean; guest: CheckinGuest }
  | { ok: false; error: 'not_found' | 'denied' | 'unknown'; message?: string };

const input = z.object({
  eventId: z.string().uuid(),
  token: z.string().min(8).max(64).optional(),
  guestId: z.string().uuid().optional(),
  /** null = automático: lo decide la base. */
  count: z.coerce.number().int().min(0).max(30).nullable(),
});

/** Marca la llegada. El acceso lo decide la base (miembros del evento o equipo). */
export async function checkIn(raw: unknown): Promise<CheckinResult> {
  await requireRole('admin', 'staff', 'client');
  const parsed = input.safeParse(raw);
  if (!parsed.success || (!parsed.data.token && !parsed.data.guestId)) return { ok: false, error: 'unknown', message: 'Datos inválidos.' };
  const { eventId, token, guestId, count } = parsed.data;

  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('rpc_checkin', { p_event_id: eventId, p_count: count ?? null, p_token: token ?? null, p_guest_id: guestId ?? null });
  if (error) return { ok: false, error: error.message.includes('acceso') ? 'denied' : 'unknown', message: error.message };
  const r = data as { ok: boolean; already?: boolean; error?: string; guest?: CheckinGuest };
  if (!r.ok) return { ok: false, error: r.error === 'not_found' ? 'not_found' : 'unknown' };
  return { ok: true, already: Boolean(r.already), guest: r.guest as CheckinGuest };
}

/** La lista completa, para buscar a mano y para el contador en vivo. */
export async function checkinSnapshot(eventId: string): Promise<CheckinGuest[]> {
  await requireRole('admin', 'staff', 'client');
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from('guests')
    .select('id, display_name, passes, status, confirmed_count, table_no, group_tag, checked_in_at, checked_in_count')
    .eq('event_id', eventId)
    .order('display_name');
  return (data ?? []) as CheckinGuest[];
}
