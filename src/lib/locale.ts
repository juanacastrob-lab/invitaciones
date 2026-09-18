import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/config';

/**
 * Qué idioma se le enseña a este invitado.
 *
 * Manda lo que pida la URL (el switch ES|EN), luego el idioma del invitado, y
 * al final el del evento. Siempre dentro de los idiomas que el evento tiene:
 * un evento solo en español nunca se pinta en inglés, pida lo que pida la URL.
 *
 * Vive aparte de la capa de datos a propósito: es lógica pura, sin secretos,
 * y así se puede probar sin levantar nada.
 */
export function resolveLocale(input: {
  languages: string[];
  defaultLanguage: string;
  guestLanguage?: string | null;
  requested?: string | null;
}): Locale {
  const available = input.languages.filter(isLocale);

  for (const candidate of [input.requested, input.guestLanguage]) {
    if (isLocale(candidate) && available.includes(candidate)) return candidate;
  }

  if (isLocale(input.defaultLanguage) && available.includes(input.defaultLanguage)) {
    return input.defaultLanguage;
  }

  return available[0] ?? DEFAULT_LOCALE;
}
