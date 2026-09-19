import { z } from 'zod';

/**
 * Validación de variables de entorno.
 *
 * Se valida al usarlas (no al importar) para que un deploy sin llaves todavía
 * configuradas compile y falle con un mensaje claro solo donde hace falta.
 */

/**
 * La URL del sitio la escribe una persona en el panel de Netlify. Si le falta
 * el https:// o le sobra una diagonal al final, se corrige en vez de tirar
 * toda la invitación por un detalle de dedo.
 */
export function normalizeSiteUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(withScheme);
    return url.origin;
  } catch {
    return undefined;
  }
}

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

function faltan(issues: z.core.$ZodIssue[]) {
  return issues.map((i) => i.path.join('.')).join(', ');
}

export function getPublicEnv() {
  const parsed = supabaseEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  });

  if (!parsed.success) {
    throw new Error(`[env] Faltan o están mal escritas: ${faltan(parsed.error.issues)}`);
  }

  return {
    ...parsed.data,
    NEXT_PUBLIC_SITE_URL: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  };
}

export function getServerEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnv() solo se puede usar en el servidor.');
  }

  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  });

  if (!parsed.success) {
    throw new Error(
      `[env] Falta SUPABASE_SERVICE_ROLE_KEY en el servidor. ` +
        `En Netlify revisa que la variable exista y que su scope incluya "Functions".`,
    );
  }

  return { ...getPublicEnv(), ...parsed.data };
}

/** Para metadata y links absolutos. Nunca truena: sin URL, se omiten. */
export function getSiteUrl(): string | undefined {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}
