import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, isLocale } from '@/lib/config';

/**
 * El idioma NO va en la URL: el link de la invitación se queda corto
 * (/i/slug/token) y el idioma se resuelve por invitado o por evento.
 *
 * Las páginas de invitación piden explícitamente el idioma que toca; las de
 * marketing usan el base y siguen siendo estáticas.
 */
export default getRequestConfig(async ({ locale }) => {
  const resolved = isLocale(locale) ? locale : DEFAULT_LOCALE;

  return {
    locale: resolved,
    messages: (await import(`../messages/${resolved}.json`)).default,
  };
});
