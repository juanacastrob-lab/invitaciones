import { z } from 'zod';
import { LOCALES } from '@/lib/config';

/**
 * Lo que manda el formulario de confirmación.
 *
 * Esta es la primera línea de defensa (forma y tamaños). La segunda, y la que
 * manda, está en la base: rpc_submit_rsvp vuelve a comprobar pases, fecha
 * límite y menú contra el evento real, no contra lo que diga el formulario.
 */
export const rsvpInput = z.object({
  attending: z.boolean(),
  count: z.number().int().min(0).max(30),
  attendeeNames: z.array(z.string().trim().max(80)).max(30).default([]),
  menuChoices: z.record(z.string(), z.string().max(40)).default({}),
  dietary: z.string().trim().max(500).optional(),
  song: z.string().trim().max(200).optional(),
  message: z.string().trim().max(1000).optional(),
  locale: z.enum(LOCALES),
  /** Sin consentimiento no se guarda nada. Obligatorio por ley en MX/US/CA. */
  consent: z.literal(true),
});

export type RsvpInput = z.infer<typeof rsvpInput>;

/** Lo que va después del RSVP: respuestas a las preguntas del evento y niños. */
export const rsvpExtraInput = z.object({
  answers: z.record(z.string().max(40), z.string().trim().max(300)).default({}),
  children: z.number().int().min(0).max(30).default(0),
});

/** Códigos que devuelve la base. Se traducen en la app, no aquí. */
export const RSVP_ERROR_CODES = [
  'too_many_attempts',
  'not_found',
  'invalid_token',
  'closed',
  'invalid_payload',
  'invalid_count',
  'too_many_passes',
  'too_many_names',
  'menu_invalid',
  'consent_required',
  'unknown',
] as const;

export type RsvpErrorCode = (typeof RSVP_ERROR_CODES)[number];

export type RsvpResult =
  | { ok: true; attending: boolean; count: number; passes: number }
  | { ok: false; error: RsvpErrorCode; passes?: number };
