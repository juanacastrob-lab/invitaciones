/**
 * Configuracion global de la app.
 * El nombre comercial NUNCA se escribe a mano en los componentes: sale de aqui.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Hola Boda';
export const APP_TAGLINE = {
  es: 'Invitaciones que cuentan tu historia',
  en: 'Invitations that tell your story',
} as const;

/** WhatsApp de ventas, en E.164. Se cambia por variable cuando haya línea de empresa. */
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '+525662974440';

export function whatsappLink(text: string, number: string = WHATSAPP_NUMBER): string {
  return `https://wa.me/${number.replace(/[^\d]/g, '')}?text=${encodeURIComponent(text)}`;
}

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

/**
 * Responsable del tratamiento de datos y correo para derechos ARCO.
 * Por ley tienen que aparecer en el aviso de privacidad. Cuando Juan abra
 * una empresa, se cambian en Netlify sin tocar código.
 */
export const LEGAL_ENTITY = process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? 'Juan Antonio Castro Basurto';
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'juanacastrob@gmail.com';

/** Datos para pagar por transferencia. PROVISIONALES hasta que Juan los confirme. */
export const BANK_DETAILS = {
  bank: process.env.NEXT_PUBLIC_BANK_NAME ?? 'BBVA',
  holder: process.env.NEXT_PUBLIC_BANK_HOLDER ?? LEGAL_ENTITY,
  clabe: process.env.NEXT_PUBLIC_BANK_CLABE ?? '000000000000000000',
};
