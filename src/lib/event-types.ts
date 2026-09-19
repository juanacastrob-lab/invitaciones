/**
 * Tipos de evento. Boda primero; los demás usan la misma plantilla con
 * textos distintos. Sin dependencias de servidor: se usa en cliente y en
 * pruebas.
 */

export const EVENT_TYPES = ['boda', 'xv', 'sweet_sixteen', 'bautizo', 'baby_shower', 'graduacion', 'cumpleanos', 'primera_comunion', 'confirmacion', 'otro'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABEL: Record<EventType, { es: string; en: string }> = {
  boda: { es: 'Boda', en: 'Wedding' },
  xv: { es: 'XV años', en: 'Quinceañera (XV)' },
  sweet_sixteen: { es: 'Sweet sixteen', en: 'Sweet Sixteen' },
  bautizo: { es: 'Bautizo', en: 'Baptism' },
  baby_shower: { es: 'Baby shower', en: 'Baby shower' },
  graduacion: { es: 'Graduación', en: 'Graduation' },
  cumpleanos: { es: 'Cumpleaños', en: 'Birthday' },
  primera_comunion: { es: 'Primera comunión', en: 'First communion' },
  confirmacion: { es: 'Confirmación', en: 'Confirmation' },
  otro: { es: 'Otro evento', en: 'Other event' },
};

export function isEventType(v: unknown): v is EventType {
  return typeof v === 'string' && (EVENT_TYPES as readonly string[]).includes(v);
}

/** Solo la boda es de dos personas; en los demás el segundo nombre es opcional. */
export function needsTwoNames(type: EventType): boolean {
  return type === 'boda';
}

/** "Ana & Luis" o solo "Sofía". Para títulos, calendario y mensajes. */
export function eventNames(couple: { partnerA: string; partnerB?: string | null }, sep = ' & '): string {
  return couple.partnerB ? `${couple.partnerA}${sep}${couple.partnerB}` : couple.partnerA;
}
