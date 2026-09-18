'use client';

import { createBrowserClient } from '@supabase/ssr';

/** Solo para el flujo de login en el navegador. Usa la anon key, que es pública. */
export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createBrowserClient(url, key);
}
