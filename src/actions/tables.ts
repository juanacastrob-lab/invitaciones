'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import type { ActionResult } from '@/schemas/admin';

/** Novios, planner y equipo: la RLS de event_tables decide quién ve qué evento. */
const anyone = () => requireRole('admin', 'staff', 'client');

const tableInput = z.object({
  name: z.string().trim().min(1).max(60),
  capacity: z.coerce.number().int().min(1).max(100).optional().or(z.literal('')).or(z.nan()),
});

function paths(eventId: string) {
  revalidatePath(`/admin/events/${eventId}/tables`);
  revalidatePath(`/panel/${eventId}/mesas`);
}

export async function createTable(eventId: string, raw: unknown): Promise<ActionResult> {
  await anyone();
  const p = tableInput.safeParse(raw);
  if (!p.success) return { ok: false, error: 'Revisa el nombre y los lugares.' };
  const supabase = await supabaseServer();
  const { count } = await supabase.from('event_tables').select('id', { count: 'exact', head: true }).eq('event_id', eventId);
  const { error } = await supabase.from('event_tables').insert({ event_id: eventId, name: p.data.name, capacity: typeof p.data.capacity === 'number' ? p.data.capacity : null, sort_order: (count ?? 0) + 1 });
  if (error) return { ok: false, error: error.code === '23505' ? 'Ya hay una mesa con ese nombre.' : error.message };
  paths(eventId);
  return { ok: true };
}

export async function bulkCreateTables(eventId: string, count: number, capacity?: number, prefix = 'Mesa'): Promise<ActionResult> {
  await anyone();
  const n = Math.min(Math.max(Math.floor(count), 1), 60);
  const supabase = await supabaseServer();
  const { count: existing } = await supabase.from('event_tables').select('id', { count: 'exact', head: true }).eq('event_id', eventId);
  const rows = Array.from({ length: n }, (_, i) => ({ event_id: eventId, name: `${prefix} ${(existing ?? 0) + i + 1}`, capacity: capacity ?? null, sort_order: (existing ?? 0) + i + 1 }));
  const { error } = await supabase.from('event_tables').upsert(rows, { onConflict: 'event_id,name', ignoreDuplicates: true });
  if (error) return { ok: false, error: error.message };
  paths(eventId);
  return { ok: true };
}

export async function updateTable(eventId: string, tableId: string, raw: unknown): Promise<ActionResult> {
  await anyone();
  const p = tableInput.safeParse(raw);
  if (!p.success) return { ok: false, error: 'Revisa el nombre y los lugares.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.from('event_tables').update({ name: p.data.name, capacity: typeof p.data.capacity === 'number' ? p.data.capacity : null }).eq('id', tableId).eq('event_id', eventId);
  if (error) return { ok: false, error: error.code === '23505' ? 'Ya hay una mesa con ese nombre.' : error.message };
  // El nombre en texto que usan la exportación y el import viejo.
  await supabase.from('guests').update({ table_no: p.data.name }).eq('table_id', tableId);
  paths(eventId);
  return { ok: true };
}

export async function deleteTable(eventId: string, tableId: string): Promise<ActionResult> {
  await anyone();
  const supabase = await supabaseServer();
  const { error } = await supabase.from('event_tables').delete().eq('id', tableId).eq('event_id', eventId);
  if (error) return { ok: false, error: error.message };
  paths(eventId);
  return { ok: true };
}

export async function assignTable(eventId: string, guestId: string, tableId: string | null): Promise<ActionResult> {
  await anyone();
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('rpc_assign_table', { p_guest_id: guestId, p_table_id: tableId });
  if (error) return { ok: false, error: error.message };
  paths(eventId);
  return { ok: true };
}
