'use server';

import { createHash, randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerEnv, getSiteUrl } from '@/lib/env';
import { MEDIA_BUCKET, publicMediaUrl } from '@/lib/media';
import { draftData, type DraftData } from '@/lib/drafts';
import { isEventType, type EventType } from '@/lib/event-types';
import { emailConfig, sendEmail } from '@/lib/email/resend';
import { APP_NAME, type Locale } from '@/lib/config';
import type { ActionResult } from '@/schemas/admin';

const KEY_RE = /^[A-Za-z0-9_-]{32}$/;

async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get('x-nf-client-connection-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'sin-ip';
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

export interface DraftRow { key: string; package_code: string; event_type: EventType; template: string; locale: Locale; country: string; step: number; data: DraftData; paid: boolean }

/** El borrador con el que se arma la invitación antes de pagar. La clave es la única credencial. */
export async function createDraft(input: { packageCode: string; eventType?: string; locale: Locale; country?: string }): Promise<ActionResult<{ key: string }>> {
  const admin = supabaseAdmin();
  const { data: allowed } = await admin.rpc('rate_limit_check', { p_bucket: `draft:${await clientKey()}`, p_max: 20, p_window: '1 hour' });
  if (allowed === false) return { ok: false, error: 'Demasiados intentos. Espera un momento.' };
  const key = randomBytes(24).toString('base64url');
  const eventType = isEventType(input.eventType) ? input.eventType : 'boda';
  const { error } = await admin.from('design_drafts').insert({ key, package_code: String(input.packageCode).slice(0, 40), event_type: eventType, locale: input.locale, country: input.country ?? 'MX', content: { eventType } });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { key } };
}

export async function loadDraft(key: string): Promise<DraftRow | null> {
  if (!KEY_RE.test(key)) return null;
  const { data } = await supabaseAdmin().from('design_drafts').select('key, package_code, event_type, template, locale, country, step, content, order_id, expires_at').eq('key', key).maybeSingle();
  if (!data || new Date(data.expires_at) < new Date()) return null;
  const parsed = draftData.safeParse(data.content);
  return {
    key: data.key, package_code: data.package_code, event_type: data.event_type, template: data.template, locale: data.locale === 'en' ? 'en' : 'es', country: data.country, step: data.step,
    data: parsed.success ? { ...parsed.data, eventType: parsed.data.eventType ?? data.event_type } : draftData.parse({ eventType: data.event_type }),
    paid: Boolean(data.order_id),
  };
}

/** Se guarda en cada paso: si cierran el navegador, no pierden nada. */
export async function saveDraft(key: string, raw: unknown, step?: number): Promise<ActionResult> {
  if (!KEY_RE.test(key)) return { ok: false, error: 'Borrador inválido.' };
  const parsed = draftData.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  const d = parsed.data;
  const { error, data } = await supabaseAdmin()
    .from('design_drafts')
    .update({ content: d, template: d.template, event_type: d.eventType, email: d.email || null, phone: d.phone || null, ...(step !== undefined ? { step } : {}) })
    .eq('key', key).is('order_id', null).gt('expires_at', new Date().toISOString())
    .select('key').maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'Este borrador ya caducó o ya se pagó.' };
  return { ok: true };
}

/** Foto del wizard: JPEG (el PDF y la tarjeta no leen WebP), a una carpeta del borrador. */
export async function createDraftUploadUrl(key: string): Promise<ActionResult<{ path: string; token: string; publicUrl: string }>> {
  if (!KEY_RE.test(key)) return { ok: false, error: 'Borrador inválido.' };
  const admin = supabaseAdmin();
  const { data: d } = await admin.from('design_drafts').select('key').eq('key', key).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (!d) return { ok: false, error: 'Este borrador ya caducó.' };
  const path = `drafts/${key}/${randomBytes(9).toString('base64url')}.jpg`;
  const { data, error } = await admin.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: error?.message ?? 'No se pudo preparar la subida.' };
  return { ok: true, data: { path, token: data.token, publicUrl: publicMediaUrl(getServerEnv().NEXT_PUBLIC_SUPABASE_URL, path) } };
}

/** "Guardar y seguir después": le mandamos el link del borrador a su correo. */
export async function emailDraftLink(key: string, email: string, locale: Locale): Promise<ActionResult> {
  if (!KEY_RE.test(key)) return { ok: false, error: 'Borrador inválido.' };
  const to = String(email).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, error: locale === 'en' ? 'Enter a valid email.' : 'Escribe un correo válido.' };
  await supabaseAdmin().from('design_drafts').update({ email: to }).eq('key', key);
  if (!emailConfig()) return { ok: false, error: locale === 'en' ? 'Email is not set up yet: copy the link instead.' : 'El correo aún no está configurado: copia el link de arriba.' };
  const site = getSiteUrl() ?? '';
  const link = `${site}/comprar?d=${key}${locale === 'en' ? '&lang=en' : ''}`;
  const subject = locale === 'en' ? `Your invitation draft · ${APP_NAME}` : `Tu invitación en proceso · ${APP_NAME}`;
  const body = locale === 'en' ? `Pick up where you left off: ${link}\n\nThe draft is kept for 48 hours.` : `Sigue donde te quedaste: ${link}\n\nEl borrador se guarda 48 horas.`;
  const r = await sendEmail({ to, subject, text: body, html: `<p>${body.replace(link, `<a href="${link}">${link}</a>`).replace(/\n/g, '<br>')}</p>` });
  return r.ok ? { ok: true, message: locale === 'en' ? 'Sent. Check your inbox.' : 'Listo. Revisa tu correo.' } : { ok: false, error: r.error };
}
