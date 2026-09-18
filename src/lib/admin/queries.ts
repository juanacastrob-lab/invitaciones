import 'server-only';
import { supabaseServer } from '@/lib/supabase/server';
import type { EventStatus } from '@/lib/admin/labels';
import type { EventType } from '@/lib/event-types';

export interface EventRow {
  id: string;
  slug: string;
  status: EventStatus;
  type: EventType;
  package_code: string | null;
  languages: string[];
  default_language: string;
  timezone: string;
  country: string;
  rsvp_deadline: string | null;
  allow_public_rsvp: boolean;
  show_private_gifts: boolean;
  preview_key: string;
  og_image_url: string | null;
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EventStats {
  guests: number;
  passes: number;
  confirmed_people: number;
  confirmed: number;
  declined: number;
  pending: number;
  opened_pending: number;
  sent: number;
}

export interface GuestRow {
  id: string;
  display_name: string;
  passes: number;
  phone: string | null;
  email: string | null;
  language: string;
  token: string;
  group_tag: string | null;
  table_no: string | null;
  table_id: string | null;
  status: 'pending' | 'confirmed' | 'declined';
  confirmed_count: number;
  sent_at: string | null;
  opened_at: string | null;
  responded_at: string | null;
  reminder_count: number;
}

const EVENT_COLS =
  'id, slug, status, type, package_code, languages, default_language, timezone, country, rsvp_deadline, allow_public_rsvp, show_private_gifts, preview_key, og_image_url, content, created_at, updated_at';

export async function listEvents(): Promise<(EventRow & { stats: EventStats })[]> {
  const supabase = await supabaseServer();
  const [{ data: events }, { data: stats }] = await Promise.all([
    supabase.from('events').select(EVENT_COLS).order('created_at', { ascending: false }),
    supabase.from('event_stats').select('*'),
  ]);
  const byId = new Map((stats ?? []).map((s) => [s.event_id as string, s as unknown as EventStats & { event_id: string }]));
  return ((events ?? []) as EventRow[]).map((e) => ({
    ...e,
    stats: byId.get(e.id) ?? { guests: 0, passes: 0, confirmed_people: 0, confirmed: 0, declined: 0, pending: 0, opened_pending: 0, sent: 0 },
  }));
}

export async function getEvent(id: string): Promise<(EventRow & { stats: EventStats }) | null> {
  const supabase = await supabaseServer();
  const [{ data: event }, { data: stats }] = await Promise.all([
    supabase.from('events').select(EVENT_COLS).eq('id', id).maybeSingle(),
    supabase.from('event_stats').select('*').eq('event_id', id).maybeSingle(),
  ]);
  if (!event) return null;
  return {
    ...(event as EventRow),
    stats: (stats as unknown as EventStats | null) ?? { guests: 0, passes: 0, confirmed_people: 0, confirmed: 0, declined: 0, pending: 0, opened_pending: 0, sent: 0 },
  };
}

export async function listGuests(eventId: string): Promise<GuestRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from('guests')
    .select('id, display_name, passes, phone, email, language, token, group_tag, table_no, table_id, status, confirmed_count, sent_at, opened_at, responded_at, reminder_count')
    .eq('event_id', eventId)
    .order('display_name');
  return (data ?? []) as GuestRow[];
}

export async function listTemplates(): Promise<{ key: string; language: string; body: string }[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('message_templates').select('key, language, body').order('key');
  return data ?? [];
}

/** Los mensajes que dejaron los invitados, para el panel de novios y el admin. */
export async function listMessages(eventId: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from('rsvp_responses')
    .select('id, message, song, dietary, created_at, guests!inner(display_name, event_id)')
    .eq('guests.event_id', eventId)
    .not('message', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200);
  return (data ?? []) as unknown as { id: string; message: string; song: string | null; dietary: string | null; created_at: string; guests: { display_name: string } }[];
}

export async function listMembers(eventId: string): Promise<{ id: string; email: string; accepted_at: string | null }[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from('event_member_invites')
    .select('id, email, accepted_at')
    .eq('event_id', eventId)
    .order('created_at');
  return data ?? [];
}

/** Los eventos que la RLS deja ver a quien esté en sesión: para el panel de novios. */
export async function listMyEvents() {
  return listEvents();
}

export interface TableRow {
  table_id: string;
  name: string;
  capacity: number | null;
  sort_order: number;
  guests: number;
  passes: number;
  confirmed_people: number;
}

export async function listTables(eventId: string): Promise<TableRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from('table_stats')
    .select('table_id, name, capacity, sort_order, guests, passes, confirmed_people')
    .eq('event_id', eventId)
    .order('sort_order')
    .order('name');
  return (data ?? []) as TableRow[];
}

// -----------------------------------------------------------------------------
// Equipo y precios (solo admin; la RLS devuelve vacío a los demás)
// -----------------------------------------------------------------------------

export interface ProfileRow { user_id: string; email: string | null; name: string | null; role: 'admin' | 'staff' | 'client'; created_at: string }
export interface InviteRow { id: string; email: string; accepted_at: string | null; created_at: string }

export async function listTeam(): Promise<{ profiles: ProfileRow[]; invites: InviteRow[] }> {
  const supabase = await supabaseServer();
  const [{ data: profiles }, { data: invites }] = await Promise.all([
    supabase.from('profiles').select('user_id, email, name, role, created_at').order('role').order('created_at'),
    supabase.from('team_invites').select('id, email, accepted_at, created_at').is('accepted_at', null).order('created_at'),
  ]);
  return { profiles: (profiles ?? []) as ProfileRow[], invites: (invites ?? []) as InviteRow[] };
}

export interface PriceRow { id: string; code: string; name: string; description?: string | null; country: string; currency: string; price: number; active: boolean; features?: string[]; included_in?: string[] }

/** Todos los paquetes y extras, activos o no, sin caché: es la pantalla de precios. */
export async function listPricing(): Promise<{ packages: PriceRow[]; extras: PriceRow[] }> {
  const supabase = await supabaseServer();
  const [{ data: packages }, { data: extras }] = await Promise.all([
    supabase.from('packages').select('id, code, name, country, currency, price, active, features').order('country').order('price'),
    supabase.from('extras').select('id, code, name, description, country, currency, price, active, included_in').order('country').order('sort_order'),
  ]);
  const num = (r: Record<string, unknown>) => ({ ...r, price: Number(r.price) }) as PriceRow;
  return { packages: (packages ?? []).map(num), extras: (extras ?? []).map(num) };
}
