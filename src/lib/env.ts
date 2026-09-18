import { z } from 'zod';

/**
 * Validacion de variables de entorno.
 * Se valida al usarlas (no al importar) para que un deploy sin llaves todavia
 * configuradas compile y falle con un mensaje claro solo donde hace falta.
 */

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

export function getPublicEnv() {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Faltan variables de entorno publicas: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`,
    );
  }

  return parsed.data;
}

export function getServerEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnv() solo se puede usar en el servidor.');
  }

  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      `Faltan variables de entorno de servidor: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`,
    );
  }

  return { ...getPublicEnv(), ...parsed.data };
}
