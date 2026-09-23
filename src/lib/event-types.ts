/**
 * Tipos de evento. Boda primero; los demás usan la misma plantilla con
 * textos distintos. Sin dependencias de servidor: se usa en cliente y en
 * pruebas.
 */

export const EVENT_TYPES = ['boda', 'xv', 'sweet_sixteen', 'bautizo', 'baby_shower', 'graduacion', 'cumpleanos', 'primera_comunion', 'confirmacion', 'bar_mitzvah', 'bridal_shower', 'engagement', 'anniversary', 'otro'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABEL: Record<EventType, { es: string; en: string }> = {
  boda: { es: 'Boda', en: 'Wedding' },
  xv: { es: 'XV años', en: 'Quinceañera' },
  sweet_sixteen: { es: 'Sweet sixteen', en: 'Sweet Sixteen' },
  bautizo: { es: 'Bautizo', en: 'Baptism' },
  baby_shower: { es: 'Baby shower', en: 'Baby Shower' },
  graduacion: { es: 'Graduación', en: 'Graduation' },
  cumpleanos: { es: 'Cumpleaños', en: 'Birthday' },
  primera_comunion: { es: 'Primera comunión', en: 'First Communion' },
  confirmacion: { es: 'Confirmación', en: 'Confirmation' },
  bar_mitzvah: { es: 'Bar / Bat Mitzvah', en: 'Bar / Bat Mitzvah' },
  bridal_shower: { es: 'Despedida de soltera', en: 'Bridal Shower' },
  engagement: { es: 'Compromiso', en: 'Engagement Party' },
  anniversary: { es: 'Aniversario', en: 'Anniversary' },
  otro: { es: 'Otro evento', en: 'Other event' },
};

/** México y EE. UU./Canadá celebran distinto: cada región ve sus fiestas con sus nombres. */
export const REGIONS = ['MX', 'US'] as const;
export type Region = (typeof REGIONS)[number];

export const EVENT_TYPES_BY_REGION: Record<Region, EventType[]> = {
  MX: ['boda', 'xv', 'bautizo', 'baby_shower', 'primera_comunion', 'confirmacion', 'graduacion', 'cumpleanos', 'bridal_shower', 'anniversary', 'otro'],
  US: ['boda', 'xv', 'sweet_sixteen', 'bar_mitzvah', 'baby_shower', 'bridal_shower', 'engagement', 'bautizo', 'primera_comunion', 'graduacion', 'cumpleanos', 'anniversary', 'otro'],
};

export function isRegion(v: unknown): v is Region {
  return v === 'MX' || v === 'US';
}

/** País del cliente → región de la tienda. Canadá compra en la tienda de EE. UU. */
export function regionForCountry(country: string | null | undefined): Region {
  return country === 'US' || country === 'CA' ? 'US' : 'MX';
}

export function isEventType(v: unknown): v is EventType {
  return typeof v === 'string' && (EVENT_TYPES as readonly string[]).includes(v);
}

/** Boda, compromiso y aniversario son de dos personas; en los demás el segundo nombre es opcional. */
export function needsTwoNames(type: EventType): boolean {
  return type === 'boda' || type === 'engagement' || type === 'anniversary';
}

/** "Ana & Luis" o solo "Sofía". Para títulos, calendario y mensajes. */
export function eventNames(couple: { partnerA: string; partnerB?: string | null }, sep = ' & '): string {
  return couple.partnerB ? `${couple.partnerA}${sep}${couple.partnerB}` : couple.partnerA;
}
