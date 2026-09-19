import { z } from 'zod';
import { LEAD_STAGES, ACTIVITY_KINDS, SOURCES, LOST_REASONS } from '@/lib/crm';
import { EVENT_TYPES } from '@/lib/event-types';

const optText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

/** Alta manual de prospecto desde el admin. Solo nombre y teléfono son obligatorios. */
export const leadCreate = z.object({
  partnerA: z.string().trim().min(1, 'Falta el nombre.').max(80),
  partnerB: optText(80),
  phone: z.string().trim().min(6, 'Falta el teléfono.').max(30),
  email: z.string().trim().toLowerCase().email('Correo inválido.').max(200).optional().or(z.literal('')),
  country: z.enum(['MX', 'US', 'CA']).default('MX'),
  language: z.enum(['es', 'en']).default('es'),
  eventType: z.enum(EVENT_TYPES).default('boda'),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  city: optText(80),
  guestsEstimate: z.coerce.number().int().min(1).max(5000).optional().or(z.literal('')),
  source: z.enum(SOURCES as [string, ...string[]]).default('otro'),
  notes: optText(2000),
});
export type LeadCreate = z.infer<typeof leadCreate>;

/** Lo que el equipo puede cambiar de un prospecto desde su ficha. */
export const leadUpdate = z.object({
  stage: z.enum(LEAD_STAGES).optional(),
  nextFollowUp: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  value: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  packageCode: optText(40),
  lostReason: z.enum(LOST_REASONS).nullable().optional(),
  notes: z.string().trim().max(5000).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  city: optText(80),
  email: z.string().trim().toLowerCase().email().max(200).nullable().optional().or(z.literal('')),
  partnerA: z.string().trim().min(1).max(80).optional(),
  partnerB: z.string().trim().max(80).nullable().optional(),
  guestsEstimate: z.coerce.number().int().min(1).max(5000).nullable().optional(),
});
export type LeadUpdate = z.infer<typeof leadUpdate>;

export const activityCreate = z.object({
  kind: z.enum(ACTIVITY_KINDS),
  body: z.string().trim().min(1, 'Escribe algo.').max(2000),
  dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/).optional().or(z.literal('')),
});

export const waReply = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1, 'Escribe el mensaje.').max(4096),
});
