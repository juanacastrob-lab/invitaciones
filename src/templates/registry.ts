import type { CSSProperties } from 'react';

/**
 * Plantillas de diseño. Todas comparten el mismo layout (Aurora) y el mismo
 * contenido del evento; cambian colores, tipografía de títulos y cómo se
 * arma la portada. Así una plantilla nueva son 10 líneas, no 500.
 */

export const TEMPLATE_IDS = ['aurora', 'noche', 'jardin', 'minimal', 'fiesta'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export interface TemplateTheme {
  id: TemplateId;
  name: { es: string; en: string };
  description: { es: string; en: string };
  colors: { paper: string; ink: string; muted: string; line: string; accent: string; accentSoft: string };
  /** overlay = foto a pantalla completa con velo; split = foto con nombres en blanco sobre degradado; frame = foto enmarcada sobre el fondo. */
  cover: 'overlay' | 'split' | 'frame';
  heading: 'serif' | 'sans';
  /** Esquinas: rectas (sm) o redondeadas (xl). */
  radius: 'sm' | 'xl';
  dark: boolean;
}

export const TEMPLATES: Record<TemplateId, TemplateTheme> = {
  aurora: {
    id: 'aurora',
    name: { es: 'Aurora', en: 'Aurora' },
    description: { es: 'Crema y salvia, serif clásica. La de siempre.', en: 'Cream and sage, classic serif. The original.' },
    colors: { paper: '#faf8f5', ink: '#2e2c29', muted: '#8a837a', line: '#e2dcd3', accent: '#7d8471', accentSoft: '#eef0ea' },
    cover: 'overlay', heading: 'serif', radius: 'sm', dark: false,
  },
  noche: {
    id: 'noche',
    name: { es: 'Noche', en: 'Night' },
    description: { es: 'Fondo oscuro y dorado. Elegante, de noche.', en: 'Dark background with gold. Elegant evening look.' },
    colors: { paper: '#14161c', ink: '#f3efe7', muted: '#a39c90', line: '#2c2f38', accent: '#c9a86a', accentSoft: '#1f222b' },
    cover: 'split', heading: 'serif', radius: 'sm', dark: true,
  },
  jardin: {
    id: 'jardin',
    name: { es: 'Jardín', en: 'Garden' },
    description: { es: 'Verdes suaves y rosa. Foto enmarcada, esquinas redondas.', en: 'Soft greens and rose. Framed photo, rounded corners.' },
    colors: { paper: '#f6f8f2', ink: '#2f3a2f', muted: '#6f7d6a', line: '#d9e2d2', accent: '#b56b7a', accentSoft: '#eef3e8' },
    cover: 'frame', heading: 'serif', radius: 'xl', dark: false,
  },
  minimal: {
    id: 'minimal',
    name: { es: 'Mínima', en: 'Minimal' },
    description: { es: 'Blanco y negro, sin adornos, títulos sin serifa.', en: 'Black and white, no ornaments, sans-serif titles.' },
    colors: { paper: '#ffffff', ink: '#111111', muted: '#6b6b6b', line: '#e5e5e5', accent: '#111111', accentSoft: '#f3f3f3' },
    cover: 'overlay', heading: 'sans', radius: 'sm', dark: false,
  },
  fiesta: {
    id: 'fiesta',
    name: { es: 'Fiesta', en: 'Party' },
    description: { es: 'Coral y ciruela, alegre. Para XV, cumpleaños y graduaciones.', en: 'Coral and plum, cheerful. For quinceañeras, birthdays and graduations.' },
    colors: { paper: '#fff7f2', ink: '#3a2434', muted: '#8c6b7c', line: '#f0d9d0', accent: '#e0654f', accentSoft: '#ffe7dc' },
    cover: 'frame', heading: 'serif', radius: 'xl', dark: false,
  },
};

export function isTemplateId(v: unknown): v is TemplateId {
  return typeof v === 'string' && (TEMPLATE_IDS as readonly string[]).includes(v);
}

/** Cualquier valor raro de la base cae en Aurora: la invitación nunca se rompe por esto. */
export function resolveTemplate(id: string | null | undefined): TemplateTheme {
  return isTemplateId(id) ? TEMPLATES[id] : TEMPLATES.aurora;
}

export function templateCssVars(theme: TemplateTheme): CSSProperties {
  return {
    '--paper': theme.colors.paper,
    '--ink': theme.colors.ink,
    '--muted': theme.colors.muted,
    '--line': theme.colors.line,
    '--accent': theme.colors.accent,
    '--accent-soft': theme.colors.accentSoft,
    colorScheme: theme.dark ? 'dark' : 'light',
  } as CSSProperties;
}
