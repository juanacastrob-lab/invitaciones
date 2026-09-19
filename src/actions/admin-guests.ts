'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { guestInput, importRow, type ActionResult } from '@/schemas/admin';
import { normalizePhone, type LeadCountry } from '@/schemas/lead';
import { isLocale } from '@/lib/config';

function phoneOrError(raw: string | undefined, country: LeadCountry): { phone: string | null } | { error: string } {
  if (!raw) return { phone: null };
  const phone = normalizePhone(raw, country);
  return phone ? { phone } : { error: `Teléfono inválido para ${country}: ${raw}` };
}

async function eventCountry(eventId: string): Promise<LeadCountry> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('events').select('country').eq('id', eventId).single();
  return ((data?.country as LeadCountry | undefined) ?? 'MX');
}

export async function addGuest(eventId: string, raw: unknown): Promise<ActionResult> {
  await requireRole('admin', 'staff', 'client'); // los novios: solo mientras no esté publicado (RLS)
  const parsed = guestInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const g = parsed.data;

  const p = phoneOrError(g.phone, await eventCountry(eventId));
  if ('error' in p) return { ok: false, error: p.error, field: 'phone' };

  const supabase = await supabaseServer();
  const { error } = await supabase.from('guests').insert({
    event_id: eventId,
    display_name: g.displayName,
    passes: g.passes,
    phone: p.phone,
    email: g.email || null,
    language: g.language,
    group_tag: g.groupTag || null,
    table_no: g.tableNo || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/events/${eventId}/guests`);
  return { ok: true, message: 'Invitado agregado.' };
}

export async function updateGuest(eventId: string, guestId: string, raw: unknown): Promise<ActionResult> {
  await requireRole('admin', 'staff', 'client'); // los novios: solo mientras no esté publicado (RLS)
  const parsed = guestInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const g = parsed.data;

  const p = phoneOrError(g.phone, await eventCountry(eventId));
  if ('error' in p) return { ok: false, error: p.error, field: 'phone' };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('guests')
    .update({
      display_name: g.displayName,
      passes: g.passes,
      phone: p.phone,
      email: g.email || null,
      language: g.language,
      group_tag: g.groupTag || null,
      table_no: g.tableNo || null,
    })
    .eq('id', guestId)
    .eq('event_id', eventId);
  if (error) {
    if (error.code === '23514') return { ok: false, error: 'Ya confirmó más personas que los pases nuevos.' };
    return { ok: false, error: error.message };
  }

  revalidatePath(`/admin/events/${eventId}/guests`);
  return { ok: true, message: 'Guardado.' };
}

export async function deleteGuest(eventId: string, guestId: string): Promise<ActionResult> {
  await requireRole('admin', 'staff', 'client'); // los novios: solo mientras no esté publicado (RLS)
  const supabase = await supabaseServer();
  const { error } = await supabase.from('guests').delete().eq('id', guestId).eq('event_id', eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/events/${eventId}/guests`);
  return { ok: true };
}

/** Un token nuevo invalida el link anterior. Para cuando alguien reenvió el suyo a quien no debía. */
export async function regenerateToken(eventId: string, guestId: string): Promise<ActionResult> {
  await requireRole('admin', 'staff');
  const supabase = await supabaseServer();
  const { data: tok } = await supabase.rpc('gen_guest_token');
  if (!tok) return { ok: false, error: 'No se pudo generar el token.' };
  const { error } = await supabase
    .from('guests')
    .update({ token: tok, sent_at: null, opened_at: null })
    .eq('id', guestId)
    .eq('event_id', eventId);
  if (error) return { ok: false, error: error.message };
  await supabase.rpc('log_activity', { p_entity: 'guest', p_entity_id: guestId, p_action: 'regenerate_token' });
  revalidatePath(`/admin/events/${eventId}/guests`);
  return { ok: true, message: 'Link nuevo generado; el anterior ya no sirve.' };
}

export async function markSent(eventId: string, guestId: string, reminder: boolean): Promise<ActionResult> {
  await requireRole('admin', 'staff');
  const supabase = await supabaseServer();
  const { data: g } = await supabase.from('guests').select('reminder_count').eq('id', guestId).single();
  const { error } = await supabase
    .from('guests')
    .update(reminder ? { reminder_count: (g?.reminder_count ?? 0) + 1 } : { sent_at: new Date().toISOString() })
    .eq('id', guestId)
    .eq('event_id', eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/events/${eventId}/send`);
  return { ok: true };
}

// -----------------------------------------------------------------------------
// Importar Excel / CSV
// -----------------------------------------------------------------------------

const HEADER_ALIASES: Record<string, keyof typeof importRow.shape> = {
  nombre: 'displayName', name: 'displayName', invitado: 'displayName', guest: 'displayName',
  pases: 'passes', passes: 'passes', boletos: 'passes', lugares: 'passes',
  telefono: 'phone', teléfono: 'phone', phone: 'phone', whatsapp: 'phone', celular: 'phone',
  correo: 'email', email: 'email', mail: 'email',
  idioma: 'language', language: 'language', lang: 'language',
  grupo: 'groupTag', group: 'groupTag', lado: 'groupTag', familia: 'groupTag',
  mesa: 'tableNo', table: 'tableNo',
};

function normalizeHeader(h: unknown): string {
  return String(h ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Lee el archivo (xlsx, xls o csv), acepta encabezados en español o inglés en
 * cualquier orden, y devuelve lo que se pudo cargar y lo que no, fila por
 * fila. No aborta todo por una fila mala: la administrativa corrige esas y
 * vuelve a subir solo las que faltaron.
 */
export async function importGuests(eventId: string, formData: FormData): Promise<ActionResult<{ inserted: number; errors: string[] }>> {
  await requireRole('admin', 'staff', 'client'); // los novios: solo mientras no esté publicado (RLS)
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Elige un archivo.' };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: 'El archivo pesa más de 5 MB.' };

  const XLSX = await import('xlsx');
  const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { ok: false, error: 'El archivo no tiene hojas.' };
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (rows.length === 0) return { ok: false, error: 'El archivo está vacío.' };

  const country = await eventCountry(eventId);
  const supabase = await supabaseServer();
  const { data: ev } = await supabase.from('events').select('default_language').eq('id', eventId).single();
  const defaultLang = ev?.default_language ?? 'es';

  const toInsert: Record<string, unknown>[] = [];
  const errors: string[] = [];

  rows.forEach((r, idx) => {
    const line = idx + 2; // 1 = encabezados
    const mapped: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      const key = HEADER_ALIASES[normalizeHeader(k)];
      if (key) mapped[key] = v;
    }
    const parsed = importRow.safeParse(mapped);
    if (!parsed.success) {
      errors.push(`Fila ${line}: ${parsed.error.issues[0].path.join('.')} ${parsed.error.issues[0].message}`);
      return;
    }
    const g = parsed.data;
    const p = phoneOrError(g.phone, country);
    if ('error' in p) {
      errors.push(`Fila ${line}: ${p.error}`);
      return;
    }
    const lang = g.language.startsWith('en') ? 'en' : g.language.startsWith('es') ? 'es' : defaultLang;
    toInsert.push({
      event_id: eventId,
      display_name: g.displayName,
      passes: g.passes,
      phone: p.phone,
      email: g.email || null,
      language: isLocale(lang) ? lang : 'es',
      group_tag: g.groupTag || null,
      table_no: g.tableNo || null,
    });
  });

  // Mesas que vienen en el archivo: se crean si no existen y se ligan.
  const tableNames = [...new Set(toInsert.map((g) => g.table_no).filter((v): v is string => Boolean(v)))];
  if (tableNames.length) {
    await supabase.from('event_tables').upsert(tableNames.map((name) => ({ event_id: eventId, name })), { onConflict: 'event_id,name', ignoreDuplicates: true });
    const { data: tables } = await supabase.from('event_tables').select('id, name').eq('event_id', eventId);
    const byName = new Map((tables ?? []).map((t) => [t.name, t.id]));
    for (const g of toInsert) if (g.table_no) g.table_id = byName.get(g.table_no as string) ?? null;
  }

  let inserted = 0;
  if (toInsert.length) {
    const { error, count } = await supabase.from('guests').insert(toInsert, { count: 'exact' });
    if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };
    inserted = count ?? toInsert.length;
    await supabase.rpc('log_activity', { p_entity: 'event', p_entity_id: eventId, p_action: 'import_guests', p_data: { inserted, errors: errors.length } });
  }

  revalidatePath(`/admin/events/${eventId}/guests`);
  return { ok: true, data: { inserted, errors } };
}
