/** Etiquetas del CRM (puras, sin base): etapas, tipos de actividad y colores. */

export const LEAD_STAGES = ['nuevo', 'contactado', 'cotizado', 'anticipo', 'en_produccion', 'entregado', 'perdido'] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const STAGE_LABEL: Record<LeadStage, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  cotizado: 'Cotizado',
  anticipo: 'Con anticipo',
  en_produccion: 'En producción',
  entregado: 'Entregado',
  perdido: 'Perdido',
};

export const STAGE_TONE: Record<LeadStage, 'neutral' | 'green' | 'amber' | 'red' | 'blue'> = {
  nuevo: 'blue',
  contactado: 'amber',
  cotizado: 'amber',
  anticipo: 'green',
  en_produccion: 'green',
  entregado: 'neutral',
  perdido: 'red',
};

/** Las etapas "vivas": lo que se trabaja en el pipeline. */
export const OPEN_STAGES: LeadStage[] = ['nuevo', 'contactado', 'cotizado', 'anticipo', 'en_produccion'];

export const ACTIVITY_KINDS = ['nota', 'llamada', 'whatsapp', 'correo', 'tarea'] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number] | 'etapa' | 'pedido';

export const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  nota: 'Nota',
  llamada: 'Llamada',
  whatsapp: 'WhatsApp',
  correo: 'Correo',
  tarea: 'Tarea',
  etapa: 'Cambio de etapa',
  pedido: 'Pedido',
};

export const SOURCE_LABEL: Record<string, string> = {
  landing: 'Página web',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  referido: 'Referido',
  planner: 'Wedding planner',
  llamada: 'Llamada',
  panel: 'Panel del cliente',
  otro: 'Otro',
};
export const SOURCES = Object.keys(SOURCE_LABEL);

export const LOST_REASONS = ['precio', 'eligio_otro', 'no_contesto', 'cancelo_evento', 'otro'] as const;
export const LOST_REASON_LABEL: Record<(typeof LOST_REASONS)[number], string> = {
  precio: 'Precio',
  eligio_otro: 'Eligió a otro proveedor',
  no_contesto: 'Dejó de contestar',
  cancelo_evento: 'Canceló el evento',
  otro: 'Otro',
};

/** ¿Un seguimiento ya se pasó de fecha? (fecha sola, sin hora) */
export function followUpState(date: string | null | undefined, today = new Date()): 'none' | 'overdue' | 'today' | 'upcoming' {
  if (!date) return 'none';
  const d = date.slice(0, 10);
  const t = today.toISOString().slice(0, 10);
  if (d < t) return 'overdue';
  if (d === t) return 'today';
  return 'upcoming';
}

/** Días desde una fecha, redondeado hacia abajo. */
export function daysSince(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
}
