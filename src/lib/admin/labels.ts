import type { Badge } from '@/components/ui';
import type { ComponentProps } from 'react';

export const EVENT_STATUS = ['borrador', 'en_revision', 'publicado', 'finalizado', 'archivado'] as const;
export type EventStatus = (typeof EVENT_STATUS)[number];

export const STATUS_LABEL: Record<EventStatus, string> = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  publicado: 'Publicado',
  finalizado: 'Finalizado',
  archivado: 'Archivado',
};

export const STATUS_TONE: Record<EventStatus, ComponentProps<typeof Badge>['tone']> = {
  borrador: 'neutral',
  en_revision: 'amber',
  publicado: 'green',
  finalizado: 'blue',
  archivado: 'neutral',
};

/** A qué estados se puede pasar desde cada uno. Un flujo, no un menú libre. */
export const NEXT_STATUS: Record<EventStatus, EventStatus[]> = {
  borrador: ['en_revision', 'publicado'],
  en_revision: ['borrador', 'publicado'],
  publicado: ['finalizado', 'en_revision'],
  finalizado: ['archivado', 'publicado'],
  archivado: ['borrador'],
};

export const GUEST_STATUS_LABEL = { pending: 'Pendiente', confirmed: 'Confirmó', declined: 'No asiste' } as const;
export const GUEST_STATUS_TONE = { pending: 'amber', confirmed: 'green', declined: 'red' } as const;

export const TIMEZONES = [
  'America/Mexico_City', 'America/Cancun', 'America/Monterrey', 'America/Tijuana', 'America/Hermosillo',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix',
  'America/Toronto', 'America/Vancouver', 'America/Edmonton', 'America/Winnipeg', 'America/Halifax',
] as const;
