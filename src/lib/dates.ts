import type { Locale } from '@/lib/config';

/**
 * Fechas en la zona horaria del EVENTO, no en la del celular del invitado.
 *
 * Una boda a las 5 de la tarde en Tepoztlán es a las 5 de la tarde, la vea
 * alguien desde Monterrey, desde Toronto o desde un avión. Por eso el
 * contenido guarda la hora local sin zona ("2027-03-13T17:00") y la zona vive
 * aparte, en el evento.
 */

/** Cuánto se adelanta una zona respecto a UTC en un instante dado, en ms. */
function offsetAt(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const p: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }

  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return asIfUtc - instant.getTime();
}

/**
 * "2027-03-13T17:00" en America/Mexico_City -> el instante real.
 * Se calcula dos veces porque la primera estimación puede caer justo en un
 * cambio de horario de verano y salir corrida una hora.
 */
export function zonedToInstant(local: string, timeZone: string): Date {
  const match = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`Fecha con formato inesperado: ${local}`);

  const [, y, m, d, hh, mm] = match.map(Number) as unknown as number[];
  const guess = Date.UTC(y, m - 1, d, hh, mm);

  const first = offsetAt(new Date(guess), timeZone);
  const corrected = guess - first;
  const second = offsetAt(new Date(corrected), timeZone);

  return new Date(second === first ? corrected : guess - second);
}

const LOCALE_TAG: Record<Locale, string> = { es: 'es-MX', en: 'en-US' };

export function formatDate(local: string, timeZone: string, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(zonedToInstant(local, timeZone));
}

export function formatTime(local: string, timeZone: string, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(zonedToInstant(local, timeZone));
}

export function formatDateShort(local: string, timeZone: string, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(zonedToInstant(local, timeZone));
}

/**
 * Para fechas que ya son un instante (como `rsvp_deadline`, que la base guarda
 * con zona). Se pintan en la zona del evento: las 23:59 del 13 en México son
 * las 05:59 del 14 en UTC, y el invitado tiene que leer "13".
 */
export function formatInstantDate(instant: Date | string, timeZone: string, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(typeof instant === 'string' ? new Date(instant) : instant);
}

// -----------------------------------------------------------------------------
// Calendario
// -----------------------------------------------------------------------------

/** Formato que piden el .ics y Google Calendar: 20270313T230000Z */
function toCalendarStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  timeZone: string;
  /** Si no se sabe cuánto dura, se asume lo razonable para una boda. */
  durationHours?: number;
  uid: string;
  url?: string;
}

export function buildIcs(event: CalendarEvent): string {
  const start = zonedToInstant(event.startsAt, event.timeZone);
  const end = new Date(start.getTime() + (event.durationHours ?? 5) * 3600_000);

  // Los saltos de línea del formato .ics son CRLF, no da igual.
  const escape = (v: string) =>
    v.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//holaboda//invitacion//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${toCalendarStamp(new Date())}`,
    `DTSTART:${toCalendarStamp(start)}`,
    `DTEND:${toCalendarStamp(end)}`,
    `SUMMARY:${escape(event.title)}`,
    event.location ? `LOCATION:${escape(event.location)}` : null,
    event.description ? `DESCRIPTION:${escape(event.description)}` : null,
    event.url ? `URL:${event.url}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((l): l is string => l !== null);

  return lines.join('\r\n') + '\r\n';
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const start = zonedToInstant(event.startsAt, event.timeZone);
  const end = new Date(start.getTime() + (event.durationHours ?? 5) * 3600_000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toCalendarStamp(start)}/${toCalendarStamp(end)}`,
  });

  if (event.location) params.set('location', event.location);
  if (event.description) params.set('details', event.description);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
