import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getPublicEnv } from '@/lib/env';

/**
 * Cliente de Supabase para usuarios CON cuenta (staff, admin, novios).
 *
 * Usa la anon key + la sesión que viene en las cookies, así que la RLS de la
 * base aplica tal cual: un cliente solo ve sus eventos aunque el código tenga
 * un bug. Para lo público (invitados) se usa `admin.ts`, no este.
 */
export async function supabaseServer() {
  // Primero las cookies: eso le dice a Next que la página es dinámica y no
  // intenta pre-renderizarla en el build (donde no hay sesión ni variables).
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Desde un Server Component no se pueden escribir cookies; el proxy
          // ya refrescó la sesión antes, así que aquí no hace falta.
        }
      },
    },
  });
}
