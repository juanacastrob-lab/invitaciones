/**
 * Tipografías para los títulos de la invitación. Pocas y con carácter: el
 * cliente elige una y todo lo serif de su invitación la usa. Las carga
 * next/font (se descargan al construir; nada de peticiones a Google desde
 * el celular del invitado). El PDF y la tarjeta de WhatsApp siguen en Cormorant.
 */

export const FONT_IDS = ['cormorant', 'playfair', 'libre', 'cinzel', 'greatvibes', 'parisienne', 'josefin', 'montserrat'] as const;
export type FontId = (typeof FONT_IDS)[number];

export const FONTS: Record<FontId, { name: string; kind: 'serif' | 'script' | 'sans'; css: string }> = {
  cormorant: { name: 'Cormorant', kind: 'serif', css: 'var(--font-cormorant)' },
  playfair: { name: 'Playfair', kind: 'serif', css: 'var(--font-playfair)' },
  libre: { name: 'Baskerville', kind: 'serif', css: 'var(--font-libre)' },
  cinzel: { name: 'Cinzel', kind: 'serif', css: 'var(--font-cinzel)' },
  greatvibes: { name: 'Great Vibes', kind: 'script', css: 'var(--font-greatvibes)' },
  parisienne: { name: 'Parisienne', kind: 'script', css: 'var(--font-parisienne)' },
  josefin: { name: 'Josefin', kind: 'sans', css: 'var(--font-josefin)' },
  montserrat: { name: 'Montserrat', kind: 'sans', css: 'var(--font-montserrat)' },
};

export function isFontId(v: unknown): v is FontId {
  return typeof v === 'string' && (FONT_IDS as readonly string[]).includes(v);
}

/** Valor de --font-display para una fuente; sin elegir, la de siempre. */
export function fontCss(id: string | null | undefined): string {
  return FONTS[isFontId(id) ? id : 'cormorant'].css;
}
