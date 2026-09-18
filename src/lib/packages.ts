import 'server-only';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface PackageRow {
  code: string;
  name: string;
  country: string;
  currency: string;
  price: number;
  features: string[];
}

/**
 * Paquetes activos de un país, para la landing.
 *
 * Se cachean una hora: los precios cambian poco y así la portada no le pega
 * a Supabase en cada visita (ni gasta función por visita en Netlify).
 */
export const getActivePackages = unstable_cache(
  async (country: string): Promise<PackageRow[]> => {
    let admin;
    try {
      admin = supabaseAdmin();
    } catch (e) {
      console.warn('[packages] sin conexión a Supabase:', (e as Error).message);
      return [];
    }

    const { data, error } = await admin
      .from('packages')
      .select('code, name, country, currency, price, features')
      .eq('country', country)
      .eq('active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('[packages] no se pudieron leer:', error.message);
      return [];
    }

    return (data ?? []).map((p) => ({
      ...p,
      price: Number(p.price),
      features: Array.isArray(p.features) ? (p.features as string[]) : [],
    }));
  },
  ['packages-by-country'],
  { revalidate: 3600, tags: ['packages'] },
);

export function formatPrice(price: number, currency: string, locale: 'es' | 'en'): string {
  return new Intl.NumberFormat(locale === 'es' ? 'es-MX' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}
