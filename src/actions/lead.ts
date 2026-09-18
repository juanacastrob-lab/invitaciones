'use server';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/env';
import { whatsappLink } from '@/lib/config';
import { leadInput, normalizePhone, type LeadResult } from '@/schemas/lead';

async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get('x-nf-client-connection-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'sin-ip';
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

/**
 * Guarda el prospecto y, si se puede, le manda un link para crear su acceso.
 *
 * Lo del correo es "si se puede": si Supabase no manda el correo (límite de
 * envíos, correo raro), el lead se guarda igual y la persona ve su WhatsApp.
 * Perder un prospecto por un correo que no salió sería absurdo.
 */
export async function createLead(raw: unknown): Promise<LeadResult> {
  const parsed = leadInput.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    if (issues.some((i) => i.path[0] === 'consent')) return { ok: false, error: 'consent_required' };
    if (issues.some((i) => i.path[0] === 'phone')) return { ok: false, error: 'phone_invalid' };
    return { ok: false, error: 'invalid' };
  }

  const input = parsed.data;
  const phone = normalizePhone(input.phone, input.country);
  if (!phone) return { ok: false, error: 'phone_invalid' };

  const admin = supabaseAdmin();

  const { data: allowed, error: rlError } = await admin.rpc('rate_limit_check', {
    p_bucket: `lead:${await clientKey()}`,
    p_max: 5,
    p_window: '1 hour',
  });
  if (rlError) console.error('[lead] rate limit:', rlError.message);
  if (allowed === false) return { ok: false, error: 'too_many_attempts' };

  const { error } = await admin.from('leads').insert({
    partner_a: input.partnerA,
    partner_b: input.partnerB,
    email: input.email,
    phone,
    country: input.country,
    language: input.language,
    event_type: 'boda',
    event_date: input.eventDate || null,
    city: input.city || null,
    guests_estimate: input.guestsEstimate ?? null,
    package_code: input.packageCode || null,
    message: input.message || null,
    source: 'landing',
    utm_source: input.utm?.source ?? null,
    utm_medium: input.utm?.medium ?? null,
    utm_campaign: input.utm?.campaign ?? null,
    utm_content: input.utm?.content ?? null,
    consent_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[lead] no se pudo guardar:', error);
    return { ok: false, error: 'unknown' };
  }

  // Registro por correo: un magic link crea la cuenta si no existe.
  const site = getSiteUrl();
  let accountEmailSent = false;
  try {
    const supabase = await supabaseServer();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: input.email,
      options: {
        emailRedirectTo: site ? `${site}/auth/callback?next=/panel` : undefined,
        data: { name: `${input.partnerA} & ${input.partnerB}`, lang: input.locale },
      },
    });
    accountEmailSent = !otpError;
    if (otpError) console.warn('[lead] no se mandó el correo de acceso:', otpError.message);
  } catch (e) {
    console.warn('[lead] no se mandó el correo de acceso:', e);
  }

  const greeting =
    input.locale === 'en'
      ? `Hi! I'm ${input.partnerA}, I just filled out the form on ${site ?? 'holaboda.mx'} for our wedding invitation.`
      : `¡Hola! Soy ${input.partnerA}, acabo de llenar el formulario en ${site ?? 'holaboda.mx'} para nuestra invitación de boda.`;

  return { ok: true, whatsappUrl: whatsappLink(greeting), accountEmailSent };
}
