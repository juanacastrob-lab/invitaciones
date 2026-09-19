'use server';

import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { eventNames } from '@/lib/event-types';
import type { EventContent } from '@/schemas/event-content';
import type { ActionResult } from '@/schemas/admin';

/**
 * El cliente pide un cambio desde su panel. Se vuelve una tarea para hoy en
 * el CRM (ligada a su prospecto; si no existía, se crea) y queda en la bitácora.
 */
export async function requestAdjustment(eventId: string, rawText: string): Promise<ActionResult> {
  const me = await requireRole('client', 'staff', 'admin');
  const text = String(rawText ?? '').trim().slice(0, 2000);
  if (text.length < 5) return { ok: false, error: 'Cuéntanos qué quieres cambiar.' };

  // RLS: solo ve el evento si es suyo.
  const supabase = await supabaseServer();
  const { data: ev } = await supabase.from('events').select('id, content').eq('id', eventId).maybeSingle();
  if (!ev) return { ok: false, error: 'Sin acceso a este evento.' };
  const names = eventNames((ev.content as EventContent).couple);

  const admin = supabaseAdmin();
  const { data: allowed } = await admin.rpc('rate_limit_check', { p_bucket: `adjust:${me.userId}`, p_max: 10, p_window: '1 day' });
  if (allowed === false) return { ok: false, error: 'Ya mandaste varios ajustes hoy. Escríbenos por WhatsApp si es urgente.' };

  const email = me.email?.toLowerCase() ?? null;
  const { data: order } = await admin.from('orders').select('contact').eq('event_id', eventId).maybeSingle();
  const contact = (order?.contact ?? {}) as { phone?: string; email?: string; partner_a?: string; partner_b?: string | null };
  let lead = email || contact.phone
    ? (await admin.from('leads').select('id').or([email ? `email.eq.${email}` : null, contact.phone ? `phone.eq.${contact.phone}` : null].filter(Boolean).join(',')).order('created_at', { ascending: false }).limit(1).maybeSingle()).data
    : null;
  if (!lead) {
    const { data: created } = await admin.from('leads').insert({
      partner_a: contact.partner_a ?? names, partner_b: contact.partner_b ?? null, email: email ?? contact.email ?? null, phone: contact.phone ?? '+000',
      country: 'MX', source: 'panel', stage: 'en_produccion', consent_at: new Date().toISOString(),
    }).select('id').single();
    lead = created;
  }
  if (lead) {
    await admin.from('lead_activities').insert({ lead_id: lead.id, actor: me.userId, kind: 'tarea', body: `Ajuste pedido desde el panel (${names}): ${text}`, due_at: new Date().toISOString() });
    await admin.from('leads').update({ next_follow_up: new Date().toISOString().slice(0, 10) }).eq('id', lead.id);
  }
  await admin.from('activity_log').insert({ actor: me.userId, entity: 'event', entity_id: eventId, action: 'adjustment_requested', data: { text } });
  return { ok: true };
}
