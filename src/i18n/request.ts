import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE } from '@/lib/config';

/**
 * El idioma NO va en la URL: el link de la invitacion se queda corto
 * (/i/slug/token) y el idioma se resuelve por invitado o por evento.
 *
 * Aqui solo se define el idioma base del sitio. Las paginas de invitacion
 * montan su propio NextIntlClientProvider con el idioma que toca, asi las
 * paginas de marketing siguen siendo estaticas (no gastan funciones ni
 * creditos de Netlify).
 */
export default getRequestConfig(async () => ({
  locale: DEFAULT_LOCALE,
  messages: (await import(`../messages/${DEFAULT_LOCALE}.json`)).default,
}));
