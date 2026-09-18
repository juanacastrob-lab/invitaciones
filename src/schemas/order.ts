import { z } from 'zod';
import { LOCALES } from '@/lib/config';
import { EVENT_TYPES } from '@/lib/event-types';

export const BUILD_MODES = ['team', 'self', 'planner'] as const;
export type BuildMode = (typeof BUILD_MODES)[number];

export const PAYMENT_METHODS = ['card_sim', 'transfer'] as const;

export const orderInput = z
  .object({
    eventType: z.enum(EVENT_TYPES).default('boda'),
    packageCode: z.string().trim().min(1).max(40),
    extraCodes: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
    buildMode: z.enum(BUILD_MODES),
    plannerEmail: z.string().trim().toLowerCase().email().max(200).optional().or(z.literal('')),
    partnerA: z.string().trim().min(1).max(80),
    partnerB: z.string().trim().max(80).optional().or(z.literal('')),
    email: z.string().trim().toLowerCase().email().max(200),
    phone: z.string().trim().min(6).max(30),
    country: z.enum(['MX', 'US', 'CA']),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
    paymentMethod: z.enum(PAYMENT_METHODS),
    /** Solo para la tarjeta simulada: no se guarda, no se valida contra nada real. */
    card: z
      .object({
        number: z.string().regex(/^\d{13,19}$/),
        exp: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/),
        cvc: z.string().regex(/^\d{3,4}$/),
        name: z.string().trim().min(1).max(80),
      })
      .optional(),
    locale: z.enum(LOCALES),
    consent: z.literal(true),
  })
  .superRefine((v, ctx) => {
    if (v.buildMode === 'planner' && !v.plannerEmail) {
      ctx.addIssue({ code: 'custom', path: ['plannerEmail'], message: 'planner_email_required' });
    }
    if (v.paymentMethod === 'card_sim' && !v.card) {
      ctx.addIssue({ code: 'custom', path: ['card'], message: 'card_required' });
    }
  });

export type OrderInput = z.infer<typeof orderInput>;

export interface PriceLine {
  code: string;
  name: string;
  price: number;
}

/**
 * El total se calcula en el servidor con los precios de la base, nunca con
 * los que mande el navegador. Un extra que el paquete ya incluye no se cobra.
 */
export function priceOrder(
  pkg: { code: string; name: string; price: number },
  extras: { code: string; name: string; price: number; included_in: string[] }[],
  extraCodes: string[],
): { lines: PriceLine[]; total: number } {
  const wanted = new Set(extraCodes);
  const lines = extras
    .filter((e) => wanted.has(e.code) && !e.included_in.includes(pkg.code))
    .map((e) => ({ code: e.code, name: e.name, price: e.price }));
  const total = Math.round((pkg.price + lines.reduce((s, l) => s + l.price, 0)) * 100) / 100;
  return { lines, total };
}

export type OrderResult =
  | { ok: true; orderId: string; number: number; status: 'pagado' | 'pendiente'; total: number; currency: string; whatsappUrl: string }
  | { ok: false; error: 'invalid' | 'phone_invalid' | 'consent_required' | 'package_unavailable' | 'card_declined' | 'planner_email_required' | 'too_many_attempts' | 'unknown'; field?: string };
