'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { getEvent } from '@/lib/admin/queries';
import { buildGuestMessage, guestLink } from '@/lib/admin/whatsapp';
import { renderGuestEmail } from '@/lib/email/guest-email';
import { sendEmail, emailConfig } from '@/lib/email/resend';
import { eventNames } from '@/lib/event-types';
import { APP_NAME, CONTACT_EMAIL, type Locale } from '@/lib/config';
import type { ActionResult } from '@/schemas/admin';
import type { EventContent } from '@/schemas/event-content';

const input = z.object({
  eventId: z.string().uuid(),
  guestIds: z.array(z.string().uuid()).min(1).max(10), // por tanda: la función de Netlify tiene pocos segundos
  templateKey: z.enum(['invite', 'reminder_pending', 'reminder_opened', 'save_the_date', 'thank_you']),
  bodies: z.object({ es: z.string().min(1).max(4000), en: z.string().min(1).max(4000) }),
  siteUrl: z.string().url(),
});

/**
 * Manda el correo a una tanda de invitados con el mismo texto de la cola de
 * WhatsApp. Marca enviado / recordatorio igual que el botón manual.
 */
export async function sendGuestEmails(raw: unknown): Promise<ActionResult<{ sent: number; failed: { name: string; error: string }[] }>> {
  await requireRole('admin', 'staff');
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos.' };
  const { eventId, guestIds, templateKey, bodies, siteUrl } = parsed.data;
  if (!emailConfig()) return { ok: false, error: 'El correo no está configurado: faltan RESEND_API_KEY y EMAIL_FROM en Netlify.' };

  const event = await getEvent(eventId);
  if (!event) return { ok: false, error: 'Evento no encontrado.' };
  const c = event.content as unknown as EventContent;
  if (templateKey === 'save_the_date') {
    if (!event.save_the_date_enabled) return { ok: false, error: 'Activa el save the date en Datos antes de mandarlo.' };
  } else if (event.status !== 'publicado' && event.status !== 'finalizado') {
    return { ok: false, error: 'Publica el evento antes de mandar correos: los links no abren todavía.' };
  }
  if (templateKey === 'thank_you' && !c.thankYou) return { ok: false, error: 'Escribe el agradecimiento en Contenido antes de mandarlo.' };
  const couple = eventNames(c.couple);

  const supabase = await supabaseServer();
  const { data: guests } = await supabase
    .from('guests')
    .select('id, display_name, email, passes, language, token, reminder_count')
    .eq('event_id', eventId)
    .in('id', guestIds);

  let sent = 0;
  const failed: { name: string; error: string }[] = [];
  const isReminder = templateKey === 'reminder_pending' || templateKey === 'reminder_opened';
  const tracks = templateKey === 'invite' || isReminder;

  for (const g of guests ?? []) {
    if (!g.email) { failed.push({ name: g.display_name, error: 'sin correo' }); continue; }
    const locale: Locale = g.language === 'en' ? 'en' : 'es';
    const personal = guestLink(siteUrl, event.slug, g.token);
    const link = templateKey === 'save_the_date' ? `${siteUrl}/i/${event.slug}/save-the-date` : templateKey === 'thank_you' ? `${personal}/gracias` : personal;
    const message = buildGuestMessage({ template: bodies[locale], guestName: g.display_name, passes: g.passes, locale, couple, startsAt: c.startsAt, timezone: event.timezone, link });
    const mail = renderGuestEmail({ templateKey, locale, couple, message, link, appName: APP_NAME });
    const r = await sendEmail({ to: g.email, ...mail, replyTo: CONTACT_EMAIL });
    if (!r.ok) { failed.push({ name: g.display_name, error: r.error }); continue; }
    sent += 1;
    if (!tracks) continue;
    await supabase
      .from('guests')
      .update(isReminder ? { reminder_count: (g.reminder_count ?? 0) + 1 } : { sent_at: new Date().toISOString() })
      .eq('id', g.id);
  }

  if (sent) await supabase.rpc('log_activity', { p_entity: 'event', p_entity_id: eventId, p_action: 'email', p_data: { template: templateKey, sent } });
  revalidatePath(`/admin/events/${eventId}/send`);
  return { ok: true, data: { sent, failed } };
}
