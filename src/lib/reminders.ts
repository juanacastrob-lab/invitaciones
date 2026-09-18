import { zonedToInstant } from '@/lib/dates';

/**
 * Reglas de los recordatorios automáticos. Puro, sin base: se prueba solo.
 *
 * Un hito "d" (días antes) se debe cuando faltan d días o menos, y al
 * invitado no se le ha mandado ese hito ni uno más cercano. Con {7,3}:
 * de 7 a 4 días antes va el de 7; de 3 a 0, el de 3. Nunca dos veces.
 */

/** Días completos que faltan hasta el límite (o el evento). Negativo = ya pasó. */
export function daysUntil(deadline: Date, now: Date): number {
  return Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000);
}

/** El límite del RSVP si hay, si no la fecha principal en la zona del evento. */
export function reminderDeadline(event: { rsvp_deadline: string | null; startsAt: string; timezone: string }): Date {
  return event.rsvp_deadline ? new Date(event.rsvp_deadline) : zonedToInstant(event.startsAt, event.timezone);
}

/** El hito que toca hoy, o null. `lastSent` es el último hito que ya recibió el invitado. */
export function dueMilestone(reminderDays: number[], days: number, lastSent: number | null): number | null {
  if (days < 0) return null;
  const candidates = reminderDays.filter((d) => d >= days && (lastSent === null || d < lastSent));
  if (!candidates.length) return null;
  return Math.min(...candidates);
}

/** "7,3" → [7,3]; limpia basura, quita repetidos, ordena de mayor a menor. */
export function parseReminderDays(text: string): number[] {
  const out = new Set<number>();
  for (const part of text.split(/[,\s]+/).filter(Boolean)) {
    const n = Number(part);
    if (Number.isInteger(n) && n >= 0 && n <= 90) out.add(n);
  }
  return [...out].sort((a, b) => b - a);
}
