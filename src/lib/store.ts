import 'server-only';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface ExtraRow {
  code: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  included_in: string[];
}

/** Extras activos de un país, cacheados una hora igual que los paquetes. */
export const getActiveExtras = unstable_cache(
  async (country: string): Promise<ExtraRow[]> => {
    let admin;
    try {
      admin = supabaseAdmin();
    } catch {
      return [];
    }
    const { data, error } = await admin
      .from('extras')
      .select('code, name, description, price, currency, included_in')
      .eq('country', country)
      .eq('active', true)
      .order('sort_order');
    if (error) {
      console.error('[extras] no se pudieron leer:', error.message);
      return [];
    }
    return (data ?? []).map((e) => ({ ...e, price: Number(e.price), included_in: e.included_in ?? [] }));
  },
  ['extras-by-country'],
  { revalidate: 3600, tags: ['extras'] },
);

/** El planner detrás de un código de referido (para /comprar?ref=CODIGO). */
export async function getPlannerByCode(code: string | undefined): Promise<{ id: string; name: string; email: string; commission_pct: number } | null> {
  const clean = (code ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(clean)) return null;
  let admin;
  try { admin = supabaseAdmin(); } catch { return null; }
  const { data } = await admin.from('planners').select('id, name, email, commission_pct').eq('code', clean).eq('active', true).maybeSingle();
  return data ? { ...data, commission_pct: Number(data.commission_pct) } : null;
}
