import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { renderInvitationPdf } from '@/lib/pdf/invitation-pdf';
import { emailConfig, sendEmail } from '@/lib/email/resend';
import { escapeHtml } from '@/lib/email/guest-email';
import { MEDIA_BUCKET } from '@/lib/media';
import { getSiteUrl } from '@/lib/env';
import { APP_NAME, CONTACT_EMAIL, WHATSAPP_NUMBER, type Locale } from '@/lib/config';
import { eventNames } from '@/lib/event-types';
import type { EventContent } from '@/schemas/event-content';

/**
 * Express: cuando pasa la espera (deliver_at), se genera el PDF y se manda al
 * correo del cliente. Sin correo configurado no se marca entregado: se
 * reintenta en la siguiente corrida y el panel sigue mostrando "en proceso".
 */
export async function deliverExpressOrders(admin: SupabaseClient): Promise<{ delivered: number; failed: number }> {
  const out = { delivered: 0, failed: 0 };
  if (!emailConfig()) return out;
  const { data: orders } = await admin
    .from('orders')
    .select('id, number, event_id, contact, deliver_at')
    .eq('status', 'pagado').is('delivered_at', null).lte('deliver_at', new Date().toISOString()).not('event_id', 'is', null)
    .limit(10);
  const site = getSiteUrl() ?? '';
  for (const o of orders ?? []) {
    const { data: ev } = await admin.from('events').select('id, slug, timezone, default_language, content').eq('id', o.event_id).maybeSingle();
    if (!ev) continue;
    const c = ev.content as EventContent;
    const locale: Locale = ev.default_language === 'en' ? 'en' : 'es';
    const contact = o.contact as { email: string; partner_a: string };
    try {
      const pdf = await renderInvitationPdf({ content: c, timezone: ev.timezone, locale });
      const names = eventNames(c.couple);
      const panel = `${site}/panel/${ev.id}`;
      const es = locale === 'es';
      const subject = es ? `Tu invitación está lista · ${names}` : `Your invitation is ready · ${names}`;
      const text = es
        ? `¡Lista! Aquí va tu invitación en PDF, para mandarla por WhatsApp a tus invitados.\n\nSi quieres corregir algo, entra a tu panel y vuelve a descargarla: ${panel}\n\n¿Necesitas un cambio que no puedes hacer tú? Escríbenos por WhatsApp al ${WHATSAPP_NUMBER}.\n\n${APP_NAME}`
        : `Done! Here is your PDF invitation, ready to send to your guests on WhatsApp.\n\nTo fix anything, open your panel and download it again: ${panel}\n\nNeed a change you cannot make yourself? Write to us on WhatsApp at ${WHATSAPP_NUMBER}.\n\n${APP_NAME}`;
      const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#2e2c29"><p>${escapeHtml(text).replace(panel, `<a href="${panel}">${panel}</a>`).replace(/\n/g, '<br>')}</p></div>`;
      const r = await sendEmail({ to: contact.email, subject, text, html, replyTo: CONTACT_EMAIL, attachments: [{ filename: `invitacion-${ev.slug}.pdf`, content: pdf }] });
      if (!r.ok) throw new Error(r.error);
      await admin.from('orders').update({ delivered_at: new Date().toISOString() }).eq('id', o.id);
      await admin.from('activity_log').insert({ actor: null, entity: 'order', entity_id: o.id, action: 'express_delivered', data: { email: contact.email } });
      out.delivered += 1;
    } catch (e) {
      console.error('[express] no se entregó', o.number, (e as Error).message);
      out.failed += 1;
    }
  }
  return out;
}

/** Borradores de más de 48 h sin pago: se borran con sus fotos. */
export async function purgeExpiredDrafts(admin: SupabaseClient): Promise<number> {
  const { data: drafts } = await admin.from('design_drafts').select('id, key').is('order_id', null).lt('expires_at', new Date().toISOString()).limit(20);
  let n = 0;
  for (const d of drafts ?? []) {
    const { data: files } = await admin.storage.from(MEDIA_BUCKET).list(`drafts/${d.key}`);
    if (files?.length) await admin.storage.from(MEDIA_BUCKET).remove(files.map((f) => `drafts/${d.key}/${f.name}`));
    await admin.from('design_drafts').delete().eq('id', d.id);
    n += 1;
  }
  return n;
}
