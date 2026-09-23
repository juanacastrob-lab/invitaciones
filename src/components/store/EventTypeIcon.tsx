import type { EventType } from '@/lib/event-types';

/**
 * Íconos de línea fina, un solo tono, para elegir el tipo de evento. Nada de
 * emojis ni colores: la marca es clásica y elegante.
 */
export function EventTypeIcon({ type, className = 'h-7 w-7' }: { type: EventType; className?: string }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.1, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const serif = { fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 13, fill: 'currentColor', textAnchor: 'middle' as const, dominantBaseline: 'central' as const, letterSpacing: 0.5 };
  switch (type) {
    case 'boda': // dos anillos entrelazados
      return <svg viewBox="0 0 32 32" className={className} aria-hidden><circle cx="12.5" cy="17" r="7" {...p} /><circle cx="19.5" cy="17" r="7" {...p} /><path d="M12.5 10V7.5l-1.8-2h3.6l-1.8 2" {...p} /></svg>;
    case 'xv':
      return <svg viewBox="0 0 32 32" className={className} aria-hidden><circle cx="16" cy="16" r="12.5" {...p} /><text x="16" y="16.5" style={serif}>XV</text></svg>;
    case 'sweet_sixteen':
      return <svg viewBox="0 0 32 32" className={className} aria-hidden><circle cx="16" cy="16" r="12.5" {...p} /><text x="16" y="16.5" style={serif}>16</text></svg>;
    case 'bautizo': // concha
      return <svg viewBox="0 0 32 32" className={className} aria-hidden><path d="M16 26C9 26 5 21 5 15a11 11 0 0 1 22 0c0 6-4 11-11 11Z" {...p} /><path d="M16 26V8M9.5 24.5 12 9M22.5 24.5 20 9" {...p} /></svg>;
    case 'baby_shower': // corazón
      return <svg viewBox="0 0 32 32" className={className} aria-hidden><path d="M16 26s-9-5.6-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.4-9 12-9 12Z" {...p} /></svg>;
    case 'graduacion': // birrete
      return <svg viewBox="0 0 32 32" className={className} aria-hidden><path d="m4 13 12-5 12 5-12 5-12-5Z" {...p} /><path d="M9 15.5V21c0 1.7 3.1 3 7 3s7-1.3 7-3v-5.5M25 13.5V20" {...p} /></svg>;
    case 'cumpleanos': // vela
      return <svg viewBox="0 0 32 32" className={className} aria-hidden><path d="M12 14h8v12h-8zM9 26h14" {...p} /><path d="M16 11c-1.6-1.4-1.6-3.2 0-5 1.6 1.8 1.6 3.6 0 5Z" {...p} /></svg>;
    case 'primera_comunion': // cáliz
      return <svg viewBox="0 0 32 32" className={className} aria-hidden><path d="M9 7h14c0 7-3 10-7 10S9 14 9 7ZM16 17v6M11 25h10" {...p} /></svg>;
    case 'confirmacion': // paloma
      return <svg viewBox="0 0 32 32" className={className} aria-hidden><path d="M7 19c4 1 8 0 10-4 2 2 6 3 9 1-2 4-6 6-10 6l-3 4-1-4c-2-1-4-2-5-3Z" {...p} /><path d="M17 15c-1-3-2-5-5-7 4 0 7 2 8 5" {...p} /></svg>;
    case 'bar_mitzvah': // estrella de David
      return <svg viewBox="0 0 32 32" className={className} aria-hidden><path d="m16 5 9.5 16.5h-19L16 5Z" {...p} /><path d="m16 27 9.5-16.5h-19L16 27Z" {...p} /></svg>;
    case 'bridal_shower': // ramo
      return <svg viewBox="0 0 32 32" className={className} aria-hidden><circle cx="12" cy="11" r="3" {...p} /><circle cx="20" cy="11" r="3" {...p} /><circle cx="16" cy="7" r="3" {...p} /><path d="M16 14v12M12 26h8M16 20l-4-3M16 18l4-3" {...p} /></svg>;
    case 'engagement': // anillo con piedra
      return <svg viewBox="0 0 32 32" className={className} aria-hidden><circle cx="16" cy="19" r="7" {...p} /><path d="m12.5 9 3.5-4 3.5 4-3.5 3.5L12.5 9Z" {...p} /></svg>;
    case 'anniversary': // dos corazones
      return <svg viewBox="0 0 32 32" className={className} aria-hidden><path d="M12 22s-7-4.3-7-9a3.8 3.8 0 0 1 7-2.3A3.8 3.8 0 0 1 19 13c0 4.7-7 9-7 9Z" {...p} /><path d="M20 27s-6-3.7-6-7.8a3.3 3.3 0 0 1 6-2 3.3 3.3 0 0 1 6 2c0 4.1-6 7.8-6 7.8Z" {...p} /></svg>;
    default: // ornamento
      return <svg viewBox="0 0 32 32" className={className} aria-hidden><path d="M16 5v22M5 16h22" {...p} /><circle cx="16" cy="16" r="6" {...p} /></svg>;
  }
}
