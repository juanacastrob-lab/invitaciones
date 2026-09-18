import { z } from 'zod';
import { LOCALES } from '@/lib/config';
import { EVENT_STATUS, TIMEZONES } from '@/lib/admin/labels';
import { EVENT_TYPES, needsTwoNames } from '@/lib/event-types';
import { TEMPLATE_IDS } from '@/templates/registry';

/** Campos básicos del evento, los que se llenan sin tocar el JSON. */
export const eventBasics = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9-]{3,60}$/, 'Solo letras minúsculas, números y guiones (3 a 60).'),
    type: z.enum(EVENT_TYPES).default('boda'),
    packageCode: z.string().trim().max(40).optional().or(z.literal('')),
    template: z.enum(TEMPLATE_IDS).default('aurora'),
    partnerA: z.string().trim().min(1).max(80),
    partnerB: z.string().trim().max(80).optional().or(z.literal('')),
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Fecha y hora inválidas.'),
    timezone: z.enum(TIMEZONES),
    country: z.enum(['MX', 'US', 'CA']),
    languages: z.array(z.enum(LOCALES)).min(1).max(2),
    defaultLanguage: z.enum(LOCALES),
    rsvpDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
    allowPublicRsvp: z.boolean().default(false),
    showPrivateGifts: z.boolean().default(true),
    checkinEnabled: z.boolean().default(false),
    autoReminders: z.boolean().default(false),
    reminderDays: z.array(z.number().int().min(0).max(90)).max(6).default([7, 3]),
  })
  .refine((v) => v.languages.includes(v.defaultLanguage), {
    path: ['defaultLanguage'],
    message: 'El idioma principal tiene que estar entre los idiomas del evento.',
  })
  .refine((v) => !needsTwoNames(v.type) || Boolean(v.partnerB), {
    path: ['partnerB'],
    message: 'Una boda lleva los dos nombres.',
  });

export type EventBasics = z.infer<typeof eventBasics>;

export const eventStatusInput = z.enum(EVENT_STATUS);

export const guestInput = z.object({
  displayName: z.string().trim().min(1).max(120),
  passes: z.coerce.number().int().min(1).max(30),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  email: z.string().trim().toLowerCase().email().max(200).optional().or(z.literal('')),
  language: z.enum(LOCALES),
  groupTag: z.string().trim().max(60).optional().or(z.literal('')),
  tableNo: z.string().trim().max(20).optional().or(z.literal('')),
});

export type GuestInput = z.infer<typeof guestInput>;

/** Una fila del Excel/CSV de invitados, ya normalizada. */
export const importRow = z.object({
  displayName: z.string().trim().min(1).max(120),
  passes: z.coerce.number().int().min(1).max(30).default(1),
  phone: z.string().trim().max(30).optional().default(''),
  email: z.string().trim().toLowerCase().max(200).optional().default(''),
  language: z.string().trim().toLowerCase().optional().default(''),
  groupTag: z.string().trim().max(60).optional().default(''),
  tableNo: z.string().trim().max(20).optional().default(''),
});

export type ActionResult<T = unknown> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; field?: string };
