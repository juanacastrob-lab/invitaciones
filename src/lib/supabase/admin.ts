import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';

/**
 * Cliente con la service role key. SOLO servidor.
 *
 * El `import 'server-only'` de arriba rompe la compilación si este archivo
 * llega a colarse en un componente de cliente: más vale que falle el build a
 * que la llave maestra de la base termine en el navegador de un invitado.
 *
 * Los invitados no tienen cuenta, así que todo lo público pasa por aquí y por
 * las funciones `rpc_*`, que son lo único que este cliente llama en las rutas
 * públicas. La RLS sigue siendo la red de seguridad para lo demás.
 */

let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (client) return client;

  const env = getServerEnv();

  client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}
