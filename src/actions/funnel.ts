'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { isFunnelStep } from '@/lib/funnel';

/**
 * Registra un paso del embudo. Anónimo (id de sesión del navegador), sin
 * datos personales. Nunca truena la página: si falla, se ignora.
 */
export async function trackFunnel(raw: { sessionId: string; step: string; region?: string; eventType?: string; packageCode?: string; draftKey?: string; utm?: Record<string, string>; meta?: Record<string, unknown> }): Promise<void> {
  try {
    if (!raw || typeof raw.sessionId !== 'string' || !/^[A-Za-z0-9_-]{8,40}$/.test(raw.sessionId) || !isFunnelStep(raw.step)) return;
    const s = (v: unknown, n = 60) => (typeof v === 'string' && v ? v.slice(0, n) : null);
    const meta = raw.meta && typeof raw.meta === 'object' ? JSON.parse(JSON.stringify(raw.meta).slice(0, 1000)) : {};
    await supabaseAdmin().from('funnel_events').insert({
      session_id: raw.sessionId, step: raw.step, region: s(raw.region, 2), event_type: s(raw.eventType, 30), package_code: s(raw.packageCode, 40), draft_key: s(raw.draftKey, 40),
      utm_source: s(raw.utm?.source), utm_medium: s(raw.utm?.medium), utm_campaign: s(raw.utm?.campaign, 100), utm_content: s(raw.utm?.content, 100), meta,
    });
  } catch (e) {
    console.warn('[funnel]', (e as Error).message);
  }
}
