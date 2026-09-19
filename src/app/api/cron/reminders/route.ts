import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSiteUrl } from '@/lib/env';
import { emailConfig, sendEmail } from '@/lib/email/resend';
import { renderGuestEmail } from '@/lib/email/guest-email';
import { buildGuestMessage, guestLink } from '@/lib/admin/whatsapp';
import { daysUntil, dueMilestone, hoursUntil, reminderDeadline } from '@/lib/reminders';
import { zonedToInstant } from '@/lib/dates';
import { sendWhatsappTemplate, whatsappConfig } from '@/lib/whatsapp/cloud';
import { sendSms, smsConfig } from '@/lib/sms/twilio';
import { eventNames } from '@/lib/event-types';
import { APP_NAME, CONTACT_EMAIL, type Locale } from '@/lib/config';
import type { EventContent } from '@/schemas/event-content';
import { deliverExpressOrders, purgeExpiredDrafts } from '@/lib/express-delivery';

export const dynamic = 'force-dynamic';

/** Cuántos correos por llamada: la función tiene pocos segundos y Resend acepta ~2 por segundo. */
const BATCH = 15;

/**
 * Lo llama la función programada de Netlify cada 15 minutos con el secreto.
 * Idempotente: cada invitado guarda el último hito que recibió.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const canEmail = Boolean(emailConfig());
  const canWhatsapp = Boolean(whatsappConfig());
  const canSms = Boolean(smsConfig());
  const admin = supabaseAdmin();

  // ---- 0. Express que ya cumplieron su espera, y borradores caducados.
  const express = await deliverExpressOrders(admin);
  const purged = await purgeExpiredDrafts(admin);

  if (!canEmail && !canWhatsapp && !canSms) return NextResponse.json({ skipped: 'no_channel_configured', express, purged });
  const site = getSiteUrl();
  if (!site) return NextResponse.json({ skipped: 'site_url_missing', express, purged });
  const now = new Date();
  const { data: events } = await admin
    .from('events')
    .select('id, slug, timezone, rsvp_deadline, reminder_days, auto_reminders, event_reminder_hours, content')
    .eq('status', 'publicado');
  const { data: templates } = await admin.from('message_templates').select('key, language, body');
  const tpl = (key: string, lang: string) => templates?.find((t) => t.key === key && t.language === lang)?.body ?? templates?.find((t) => t.key === key)?.body ?? '';

  let sent = 0;
  let failed = 0;
  const touched: string[] = [];

  // ---- 1. "Confirma": a pendientes con correo, días antes del límite.
  for (const ev of events ?? []) {
    if (!ev.auto_reminders || !canEmail) continue;
    if (sent + failed >= BATCH) break;
    const c = ev.content as EventContent;
    const days = daysUntil(reminderDeadline({ rsvp_deadline: ev.rsvp_deadline, startsAt: c.startsAt, timezone: ev.timezone }), now);
    const reminderDays = (ev.reminder_days as number[] | null) ?? [];
    // Sin hito posible hoy para nadie: ni consultar invitados.
    if (dueMilestone(reminderDays, days, null) === null) continue;

    const { data: guests } = await admin
      .from('guests')
      .select('id, display_name, email, passes, language, token, opened_at, reminder_count, auto_reminder_milestone')
      .eq('event_id', ev.id)
      .eq('status', 'pending')
      .not('email', 'is', null)
      .limit(200);

    const couple = eventNames(c.couple);
    for (const g of guests ?? []) {
      if (sent + failed >= BATCH) break;
      const m = dueMilestone(reminderDays, days, g.auto_reminder_milestone);
      if (m === null || !g.email) continue;
      const locale: Locale = g.language === 'en' ? 'en' : 'es';
      const key = g.opened_at ? 'reminder_opened' : 'reminder_pending';
      const link = guestLink(site, ev.slug, g.token);
      const message = buildGuestMessage({ template: tpl(key, locale), guestName: g.display_name, passes: g.passes, locale, couple, startsAt: c.startsAt, timezone: ev.timezone, link });
      const mail = renderGuestEmail({ templateKey: key, locale, couple, message, link, appName: APP_NAME });
      const r = await sendEmail({ to: g.email, ...mail, replyTo: CONTACT_EMAIL });
      if (!r.ok) { failed += 1; console.warn('[reminders] falló', g.id, r.error); continue; }
      sent += 1;
      await admin.from('guests').update({ auto_reminder_milestone: m, reminder_count: (g.reminder_count ?? 0) + 1 }).eq('id', g.id);
      if (!touched.includes(ev.id)) touched.push(ev.id);
    }
  }

  // ---- 2. "Ya casi": a confirmados y pendientes, horas antes del evento.
  // WhatsApp Cloud si está configurado y hay teléfono; si no, correo.
  for (const ev of events ?? []) {
    if (sent + failed >= BATCH) break;
    const hoursList = (ev.event_reminder_hours as number[] | null) ?? [];
    if (!hoursList.length) continue;
    const c = ev.content as EventContent;
    const hours = hoursUntil(zonedToInstant(c.startsAt, ev.timezone), now);
    if (dueMilestone(hoursList, hours, null) === null) continue;

    const { data: guests } = await admin
      .from('guests')
      .select('id, display_name, email, phone, passes, language, token, reminder_count, event_reminder_milestone')
      .eq('event_id', ev.id)
      .neq('status', 'declined')
      .limit(300);
    const couple = eventNames(c.couple);
    const venue = c.itinerary?.acts[0]?.venue.name ?? '';
    for (const g of guests ?? []) {
      if (sent + failed >= BATCH) break;
      const m = dueMilestone(hoursList, hours, g.event_reminder_milestone);
      if (m === null) continue;
      const useWa = canWhatsapp && Boolean(g.phone);
      const useSms = !useWa && canSms && Boolean(g.phone);
      if (!useWa && !useSms && !(canEmail && g.email)) continue;
      const locale: Locale = g.language === 'en' ? 'en' : 'es';
      const link = guestLink(site, ev.slug, g.token);
      const message = buildGuestMessage({ template: tpl('event_soon', locale), guestName: g.display_name, passes: g.passes, locale, couple, startsAt: c.startsAt, timezone: ev.timezone, link, venue });
      const r = useWa
        ? await sendWhatsappTemplate({ to: g.phone as string, template: 'event_soon', locale, params: [g.display_name, couple, message.match(/\d{1,2}.*\d{4}/)?.[0] ?? c.startsAt.slice(0, 10), link] })
        : useSms
          ? await sendSms({ to: g.phone as string, body: message })
          : await sendEmail({ to: g.email as string, ...renderGuestEmail({ templateKey: 'event_soon', locale, couple, message, link, appName: APP_NAME }), replyTo: CONTACT_EMAIL });
      if (!r.ok) { failed += 1; console.warn('[event_soon] falló', g.id, r.error); continue; }
      sent += 1;
      await admin.from('guests').update({ event_reminder_milestone: m }).eq('id', g.id);
      if (!touched.includes(ev.id)) touched.push(ev.id);
    }
  }

  for (const id of touched) {
    await admin.from('activity_log').insert({ actor: null, entity: 'event', entity_id: id, action: 'auto_reminder', data: { sent } });
  }
  return NextResponse.json({ sent, failed, express, purged, more: sent + failed >= BATCH });
}
