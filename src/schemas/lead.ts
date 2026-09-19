import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { LOCALES } from '@/lib/config';

export const LEAD_COUNTRIES = ['MX', 'US', 'CA'] as const;
export type LeadCountry = (typeof LEAD_COUNTRIES)[number];

/**
 * Teléfono en E.164 (+52..., +1...). Se valida con libphonenumber contra el
 * país elegido, así "55 1234 5678" en México se guarda como +525512345678 y
 * el link de WhatsApp de la administrativa siempre abre.
 */
export function normalizePhone(raw: string, country: LeadCountry): string | null {
  const parsed = parsePhoneNumberFromString(raw, country);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

export const leadInput = z
  .object({
    partnerA: z.string().trim().min(1).max(80),
    partnerB: z.string().trim().min(1).max(80),
    email: z.string().trim().toLowerCase().email().max(200),
    phone: z.string().trim().min(6).max(30),
    country: z.enum(LEAD_COUNTRIES),
    language: z.enum(['es', 'en', 'both']),
    eventDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal('')),
    city: z.string().trim().max(120).optional(),
    guestsEstimate: z.coerce.number().int().min(1).max(5000).optional(),
    packageCode: z.string().trim().max(40).optional(),
    message: z.string().trim().max(2000).optional(),
    locale: z.enum(LOCALES),
    consent: z.literal(true),
    utm: z
      .object({
        source: z.string().max(100).optional(),
        medium: z.string().max(100).optional(),
        campaign: z.string().max(100).optional(),
        content: z.string().max(100).optional(),
      })
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (!normalizePhone(v.phone, v.country)) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'phone_invalid' });
    }
  });

export type LeadInput = z.infer<typeof leadInput>;

export type LeadResult =
  | { ok: true; whatsappUrl: string; accountEmailSent: boolean }
  | { ok: false; error: 'invalid' | 'phone_invalid' | 'consent_required' | 'too_many_attempts' | 'unknown' };
