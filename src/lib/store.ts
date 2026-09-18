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
