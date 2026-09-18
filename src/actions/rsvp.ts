'use server';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rsvpInput, RSVP_ERROR_CODES, type RsvpErrorCode, type RsvpResult } from '@/schemas/rsvp';

/**
 * Huella del visitante para el rate limit. Se guarda un hash, nunca la IP:
 * sirve para frenar abuso y no dice quién es nadie.
 */
async function clientKey(): Promise<string | null> {
  const h = await headers();
  const ip =
    h.get('x-nf-client-connection-ip') ??
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null;

  if (!ip) return null;
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

function isKnownCode(code: unknown): code is RsvpErrorCode {
  return typeof code === 'string' && (RSVP_ERROR_CODES as readonly string[]).includes(code);
}

export async function submitRsvp(
  slug: string,
  token: string,
  raw: unknown,
): Promise<RsvpResult> {
  const parsed = rsvpInput.safeParse(raw);
  if (!parsed.success) {
    const sinConsentimiento = parsed.error.issues.some((i) => i.path[0] === 'consent');
    return { ok: false, error: sinConsentimiento ? 'consent_required' : 'invalid_payload' };
  }

  const input = parsed.data;

  const { data, error } = await supabaseAdmin().rpc('rpc_submit_rsvp', {
    p_slug: slug,
    p_token: token,
    p_payload: {
      attending: input.attending,
      count: input.count,
      attendee_names: input.attendeeNames,
      menu_choices: input.menuChoices,
      dietary: input.dietary,
      song: input.song,
      message: input.message,
      locale: input.locale,
    },
    p_client_key: await clientKey(),
  });

  if (error) {
    console.error(`[rsvp] Supabase falló guardando la confirmación de "${slug}":`, error);
    return { ok: false, error: 'unknown' };
  }

  const result = data as { ok: boolean; error?: string; passes?: number; attending?: boolean; count?: number };

  if (!result.ok) {
    return {
      ok: false,
      error: isKnownCode(result.error) ? result.error : 'unknown',
      passes: result.passes,
    };
  }

  return {
    ok: true,
    attending: Boolean(result.attending),
    count: result.count ?? 0,
    passes: result.passes ?? 0,
  };
}
