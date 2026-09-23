import { isRegion, regionForCountry, type Region } from '@/lib/event-types';

export const REGION_COOKIE = 'hb-region';

/**
 * De dónde nos visitan. Manda la cookie (el cliente tocó el botón); si no,
 * el país que Netlify pone en x-nf-geo (o el de otros CDN); si no, el idioma
 * del navegador. Sin pistas, México.
 */
export function regionFromRequest(input: { cookie?: string | null; headers: { get(name: string): string | null } }): Region {
  if (isRegion(input.cookie)) return input.cookie;
  const h = input.headers;
  const geo = h.get('x-nf-geo');
  if (geo) {
    try {
      const parsed = JSON.parse(Buffer.from(geo, 'base64').toString('utf8')) as { country?: { code?: string } };
      if (parsed.country?.code) return regionForCountry(parsed.country.code);
    } catch { /* cabecera rara: se ignora */ }
  }
  const code = h.get('x-country') ?? h.get('cf-ipcountry') ?? h.get('x-vercel-ip-country');
  if (code && code.length === 2) return regionForCountry(code.toUpperCase());
  const lang = (h.get('accept-language') ?? '').toLowerCase();
  if (lang.startsWith('es-mx') || lang.startsWith('es')) return 'MX';
  if (lang.startsWith('en')) return 'US';
  return 'MX';
}
