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

/**
 * Botones de login que se muestran. Google y Apple requieren configurar el
 * proveedor en Supabase primero; hasta entonces, mejor no enseñar un botón
 * que va a fallar. El magic link por correo siempre está.
 */
export const AUTH_PROVIDERS = ['google', 'apple'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export function enabledAuthProviders(): AuthProvider[] {
  const raw = process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? '';
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is AuthProvider => (AUTH_PROVIDERS as readonly string[]).includes(s));
}
