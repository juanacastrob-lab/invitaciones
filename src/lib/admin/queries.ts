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
  template: string;
  checkin_enabled: boolean;
  auto_reminders: boolean;
  reminder_days: number[];
  event_reminder_hours: number[];
  save_the_date_enabled: boolean;
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
  checked_in?: number;
  checked_in_people?: number;
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
  checked_in_at?: string | null;
  checked_in_count?: number;
}

const EVENT_COLS =
  'id, slug, status, type, package_code, template, checkin_enabled, auto_reminders, reminder_days, event_reminder_hours, save_the_date_enabled, languages, default_language, timezone, country, rsvp_deadline, allow_public_rsvp, show_private_gifts, preview_key, og_image_url, content, created_at, updated_at';

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
    .select('id, message, song, dietary, answers, children_count, created_at, guests!inner(display_name, event_id)')
    .eq('guests.event_id', eventId)
    .or('message.not.is.null,answers.neq.{}')
    .order('created_at', { ascending: false })
    .limit(200);
  return (data ?? []) as unknown as { id: string; message: string | null; song: string | null; dietary: string | null; answers?: Record<string, string>; children_count?: number; created_at: string; guests: { display_name: string } }[];
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

// -----------------------------------------------------------------------------
// Bitácora
// -----------------------------------------------------------------------------

export interface ActivityRow { id: string; actor_label: string; entity: string; entity_id: string | null; entity_label: string | null; action: string; detail: string | null; created_at: string }

/** Últimos movimientos, con nombre de quien los hizo y del evento tocado. */
export async function listActivity(limit = 200): Promise<ActivityRow[]> {
  const supabase = await supabaseServer();
  const { data: log } = await supabase
    .from('activity_log')
    .select('id, actor, entity, entity_id, action, data, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  const rows = log ?? [];
  const actorIds = Array.from(new Set(rows.map((r) => r.actor).filter(Boolean))) as string[];
  const eventIds = Array.from(new Set(rows.filter((r) => r.entity === 'event' && r.entity_id).map((r) => r.entity_id))) as string[];
  const [{ data: actors }, { data: events }] = await Promise.all([
    actorIds.length ? supabase.from('profiles').select('user_id, email, name').in('user_id', actorIds) : Promise.resolve({ data: [] as { user_id: string; email: string | null; name: string | null }[] }),
    eventIds.length ? supabase.from('events').select('id, slug').in('id', eventIds) : Promise.resolve({ data: [] as { id: string; slug: string }[] }),
  ]);
  const actorBy = new Map((actors ?? []).map((a) => [a.user_id, a.name || a.email || a.user_id.slice(0, 8)]));
  const slugBy = new Map((events ?? []).map((e) => [e.id, e.slug]));
  return rows.map((r) => {
    const d = (r.data ?? {}) as Record<string, unknown>;
    const detail = r.action === 'status' ? `${d.from} → ${d.to}` : r.action === 'role' ? `→ ${d.to}` : r.action === 'paid' && d.reference ? `ref. ${d.reference}` : r.action === 'approved' ? `como ${d.by}` : null;
    return {
      id: r.id,
      actor_label: r.actor ? (actorBy.get(r.actor) ?? 'alguien') : 'sistema',
      entity: r.entity,
      entity_id: r.entity_id,
      entity_label: r.entity === 'event' && r.entity_id ? (slugBy.get(r.entity_id) ?? (typeof d.slug === 'string' ? d.slug : null)) : null,
      action: r.action,
      detail,
      created_at: r.created_at,
    };
  });
}

// -----------------------------------------------------------------------------
// Planners y comisiones
// -----------------------------------------------------------------------------

export interface PlannerRow { id: string; email: string; user_id: string | null; name: string; phone: string | null; code: string; commission_pct: number; active: boolean; notes: string | null; created_at: string }
export interface CommissionOrder { id: string; number: number; status: string; total: number; currency: string; commission_amount: number; commission_paid_at: string | null; planner_id: string; contact: { partner_a: string; partner_b: string | null }; created_at: string }

export async function listPlanners(): Promise<{ planners: PlannerRow[]; orders: CommissionOrder[] }> {
  const supabase = await supabaseServer();
  const [{ data: planners }, { data: orders }] = await Promise.all([
    supabase.from('planners').select('id, email, user_id, name, phone, code, commission_pct, active, notes, created_at').order('name'),
    supabase.from('orders').select('id, number, status, total, currency, commission_amount, commission_paid_at, planner_id, contact, created_at').not('planner_id', 'is', null).order('created_at', { ascending: false }).limit(500),
  ]);
  const num = <T extends { commission_pct?: unknown; total?: unknown; commission_amount?: unknown }>(r: T) => ({ ...r, ...(r.commission_pct !== undefined ? { commission_pct: Number(r.commission_pct) } : {}), ...(r.total !== undefined ? { total: Number(r.total), commission_amount: Number(r.commission_amount) } : {}) });
  return { planners: (planners ?? []).map(num) as PlannerRow[], orders: (orders ?? []).map(num) as CommissionOrder[] };
}

/** La ficha del planner que está en sesión, si lo es. La RLS solo le deja ver la suya. */
export async function myPlanner(userId: string): Promise<PlannerRow | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('planners').select('id, email, user_id, name, phone, code, commission_pct, active, notes, created_at').eq('user_id', userId).maybeSingle();
  return data ? ({ ...data, commission_pct: Number(data.commission_pct) } as PlannerRow) : null;
}

// ----------------------------------------------------------------- CRM
export interface LeadRow {
  id: string; partner_a: string; partner_b: string | null; email: string | null; phone: string; country: string; language: string;
  event_type: string; event_date: string | null; city: string | null; guests_estimate: number | null; package_code: string | null;
  message: string | null; source: string | null; utm_source: string | null; utm_campaign: string | null; stage: string;
  next_follow_up: string | null; notes: string | null; assigned_to: string | null; value: number | null; currency: string;
  lost_reason: string | null; last_contact_at: string | null; order_id: string | null; created_at: string; updated_at: string;
}
export interface LeadActivityRow { id: string; lead_id: string; actor: string | null; kind: string; body: string | null; due_at: string | null; done_at: string | null; created_at: string; actor_name?: string | null }

const LEAD_COLS = 'id, partner_a, partner_b, email, phone, country, language, event_type, event_date, city, guests_estimate, package_code, message, source, utm_source, utm_campaign, stage, next_follow_up, notes, assigned_to, value, currency, lost_reason, last_contact_at, order_id, created_at, updated_at';

export async function listLeads(): Promise<LeadRow[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('leads').select(LEAD_COLS).order('created_at', { ascending: false }).limit(500);
  return (data ?? []).map((l) => ({ ...l, value: l.value == null ? null : Number(l.value) })) as LeadRow[];
}

export async function getLead(id: string): Promise<{ lead: LeadRow; activities: LeadActivityRow[]; conversationId: string | null } | null> {
  const supabase = await supabaseServer();
  const [{ data: lead }, { data: acts }, { data: conv }] = await Promise.all([
    supabase.from('leads').select(LEAD_COLS).eq('id', id).maybeSingle(),
    supabase.from('lead_activities').select('id, lead_id, actor, kind, body, due_at, done_at, created_at').eq('lead_id', id).order('created_at', { ascending: false }).limit(200),
    supabase.from('wa_conversations').select('id').eq('lead_id', id).maybeSingle(),
  ]);
  if (!lead) return null;
  const actorIds = [...new Set((acts ?? []).map((a) => a.actor).filter(Boolean))] as string[];
  const names = new Map<string, string | null>();
  if (actorIds.length) {
    const { data: profiles } = await supabase.from('profiles').select('user_id, name, email').in('user_id', actorIds);
    for (const p of profiles ?? []) names.set(p.user_id, p.name ?? p.email ?? null);
  }
  return {
    lead: { ...lead, value: lead.value == null ? null : Number(lead.value) } as LeadRow,
    activities: (acts ?? []).map((a) => ({ ...a, actor_name: a.actor ? names.get(a.actor) ?? null : null })) as LeadActivityRow[],
    conversationId: conv?.id ?? null,
  };
}

export async function listTeamMembers(): Promise<{ user_id: string; name: string | null; email: string | null }[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('profiles').select('user_id, name, email').in('role', ['admin', 'staff']).order('name');
  return data ?? [];
}

// --------------------------------------------------------- bandeja WA
export interface WaConversationRow { id: string; phone: string; name: string | null; lead_id: string | null; assigned_to: string | null; last_message_at: string; last_inbound_at: string | null; unread: number; archived_at: string | null; lead_name?: string | null; lead_stage?: string | null; last_body?: string | null }
export interface WaMessageRow { id: string; direction: 'in' | 'out'; body: string | null; media_type: string | null; media_id: string | null; status: string; error: string | null; created_at: string }

export async function listConversations(archived = false): Promise<WaConversationRow[]> {
  const supabase = await supabaseServer();
  let q = supabase.from('wa_conversations').select('id, phone, name, lead_id, assigned_to, last_message_at, last_inbound_at, unread, archived_at, leads(partner_a, partner_b, stage)').order('last_message_at', { ascending: false }).limit(200);
  q = archived ? q.not('archived_at', 'is', null) : q.is('archived_at', null);
  const { data } = await q;
  const rows = (data ?? []) as unknown as (WaConversationRow & { leads: { partner_a: string; partner_b: string | null; stage: string } | { partner_a: string; partner_b: string | null; stage: string }[] | null })[];
  if (!rows.length) return [];
  // Último mensaje de cada conversación, para la vista previa de la lista.
  const { data: last } = await supabase.from('wa_messages').select('conversation_id, body, media_type, created_at').in('conversation_id', rows.map((r) => r.id)).order('created_at', { ascending: false }).limit(1000);
  const preview = new Map<string, string>();
  for (const m of last ?? []) if (!preview.has(m.conversation_id)) preview.set(m.conversation_id, m.body ?? (m.media_type ? `[${m.media_type}]` : ''));
  return rows.map(({ leads, ...r }) => {
    const l = Array.isArray(leads) ? leads[0] : leads;
    return { ...r, lead_name: l ? [l.partner_a, l.partner_b].filter(Boolean).join(' & ') : null, lead_stage: l?.stage ?? null, last_body: preview.get(r.id) ?? null };
  });
}

export async function getConversation(id: string): Promise<{ conversation: WaConversationRow; messages: WaMessageRow[] } | null> {
  const supabase = await supabaseServer();
  const [{ data: conv }, { data: messages }] = await Promise.all([
    supabase.from('wa_conversations').select('id, phone, name, lead_id, assigned_to, last_message_at, last_inbound_at, unread, archived_at, leads(partner_a, partner_b, stage)').eq('id', id).maybeSingle(),
    supabase.from('wa_messages').select('id, direction, body, media_type, media_id, status, error, created_at').eq('conversation_id', id).order('created_at').limit(500),
  ]);
  if (!conv) return null;
  const { leads, ...r } = conv as unknown as WaConversationRow & { leads: { partner_a: string; partner_b: string | null; stage: string } | { partner_a: string; partner_b: string | null; stage: string }[] | null };
  const l = Array.isArray(leads) ? leads[0] : leads;
  return { conversation: { ...r, lead_name: l ? [l.partner_a, l.partner_b].filter(Boolean).join(' & ') : null, lead_stage: l?.stage ?? null }, messages: (messages ?? []) as WaMessageRow[] };
}

export async function countUnread(): Promise<number> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('wa_conversations').select('unread').gt('unread', 0).is('archived_at', null);
  return (data ?? []).reduce((s, r) => s + Number(r.unread), 0);
}

// ------------------------------------------------------------ tablero
export interface DashboardData {
  leadsNew7d: number; leadsOpen: number; followUpsDue: LeadRow[]; unread: number;
  ordersPaidMonth: number; revenueMonth: number; ordersPending: number; expressPending: number;
  eventsByStatus: Record<string, number>; revenueByMonth: { month: string; total: number }[]; leadsByStage: Record<string, number>; leadsBySource: Record<string, number>;
}

export async function getDashboard(): Promise<DashboardData> {
  const supabase = await supabaseServer();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const sixMonths = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
  const today = now.toISOString().slice(0, 10);
  const [{ data: leads }, { data: orders }, { data: events }, unread] = await Promise.all([
    supabase.from('leads').select(LEAD_COLS).order('next_follow_up').limit(1000),
    supabase.from('orders').select('id, status, total, paid_at, created_at, package_code, event_id').gte('created_at', sixMonths).limit(2000),
    supabase.from('events').select('status'),
    countUnread(),
  ]);
  const L = (leads ?? []) as LeadRow[];
  const O = orders ?? [];
  const open = L.filter((l) => !['entregado', 'perdido'].includes(l.stage));
  const week = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const byStage: Record<string, number> = {}; const bySource: Record<string, number> = {};
  for (const l of L) { byStage[l.stage] = (byStage[l.stage] ?? 0) + 1; const s = l.source ?? 'otro'; bySource[s] = (bySource[s] ?? 0) + 1; }
  const paid = O.filter((o) => o.status === 'pagado');
  const revenueByMonth: Record<string, number> = {};
  for (const o of paid) { const m = String(o.paid_at ?? o.created_at).slice(0, 7); revenueByMonth[m] = (revenueByMonth[m] ?? 0) + Number(o.total); }
  const eventsByStatus: Record<string, number> = {};
  for (const e of events ?? []) eventsByStatus[e.status] = (eventsByStatus[e.status] ?? 0) + 1;
  return {
    leadsNew7d: L.filter((l) => l.created_at >= week).length,
    leadsOpen: open.length,
    followUpsDue: open.filter((l) => l.next_follow_up && l.next_follow_up <= today).slice(0, 20),
    unread,
    ordersPaidMonth: paid.filter((o) => String(o.paid_at ?? o.created_at) >= monthStart).length,
    revenueMonth: paid.filter((o) => String(o.paid_at ?? o.created_at) >= monthStart).reduce((s, o) => s + Number(o.total), 0),
    ordersPending: O.filter((o) => o.status === 'pendiente').length,
    expressPending: paid.filter((o) => o.package_code === 'express' && !o.event_id).length,
    eventsByStatus,
    revenueByMonth: Object.entries(revenueByMonth).sort().map(([month, total]) => ({ month, total })),
    leadsByStage: byStage,
    leadsBySource: bySource,
  };
}

/** El pedido detrás de un evento (para el Express: cuándo se entrega). RLS: solo el dueño o el equipo. */
export async function getOrderForEvent(eventId: string): Promise<{ id: string; package_code: string; deliver_at: string | null; delivered_at: string | null } | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('orders').select('id, package_code, deliver_at, delivered_at').eq('event_id', eventId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data ?? null;
}
