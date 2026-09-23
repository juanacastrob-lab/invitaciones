'use client';

import { trackFunnel } from '@/actions/funnel';
import type { FunnelStep } from '@/lib/funnel';

/**
 * Lado del navegador: id de sesión anónimo (se guarda en el navegador), los
 * UTM con los que llegó (se guardan la primera vez) y el aviso al servidor
 * y al pixel de Meta. Todo "dispara y olvida".
 */
declare global { interface Window { fbq?: (...args: unknown[]) => void } }

function store(): Storage | null { try { return window.localStorage; } catch { return null; } }

export function sessionId(): string {
  const st = store();
  let id = st?.getItem('hb-sid') ?? null;
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(12))).map((b) => b.toString(16).padStart(2, '0')).join('');
    st?.setItem('hb-sid', id);
  }
  return id;
}

/** Los UTM se capturan en la primera página y se conservan: el pago suele ser páginas después. */
export function utmParams(): Record<string, string> {
  const st = store();
  const q = new URLSearchParams(window.location.search);
  const fresh: Record<string, string> = {};
  for (const k of ['source', 'medium', 'campaign', 'content']) { const v = q.get(`utm_${k}`); if (v) fresh[k] = v.slice(0, 100); }
  if (q.get('fbclid') && !fresh.source) { fresh.source = 'facebook'; fresh.medium = fresh.medium ?? 'paid'; }
  if (Object.keys(fresh).length) { st?.setItem('hb-utm', JSON.stringify(fresh)); return fresh; }
  try { return JSON.parse(st?.getItem('hb-utm') ?? '{}') as Record<string, string>; } catch { return {}; }
}

const PIXEL: Partial<Record<FunnelStep, string>> = { preview_seen: 'ViewContent', package_selected: 'AddToCart', payment_open: 'InitiateCheckout', order_created: 'Lead', paid: 'Purchase' };
const sent = new Set<string>();

export function track(step: FunnelStep, data: { region?: string; eventType?: string; packageCode?: string; draftKey?: string; meta?: Record<string, unknown> } = {}): void {
  if (typeof window === 'undefined') return;
  const key = `${step}:${data.packageCode ?? ''}:${data.eventType ?? ''}`;
  if (sent.has(key)) return; // un paso por sesión de página
  sent.add(key);
  void trackFunnel({ sessionId: sessionId(), step, utm: utmParams(), ...data });
  const ev = PIXEL[step];
  if (ev && window.fbq) {
    const value = typeof data.meta?.value === 'number' ? data.meta.value : undefined;
    window.fbq('track', ev, value !== undefined ? { value, currency: (data.meta?.currency as string) ?? 'MXN' } : {});
  }
}
