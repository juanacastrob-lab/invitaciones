/**
 * Configuracion global de la app.
 * El nombre comercial NUNCA se escribe a mano en los componentes: sale de aqui.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Invitaciones';

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
