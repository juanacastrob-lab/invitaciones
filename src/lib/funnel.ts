/** Pasos del embudo, en orden. Lo que no está aquí no se registra. */
export const FUNNEL_STEPS = ['landing_view', 'store_open', 'type_selected', 'basics_done', 'preview_seen', 'package_selected', 'payment_open', 'order_created', 'paid'] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const FUNNEL_LABEL: Record<FunnelStep, string> = {
  landing_view: 'Vio la portada',
  store_open: 'Abrió la tienda',
  type_selected: 'Eligió tipo de evento',
  basics_done: 'Puso nombres y fecha',
  preview_seen: 'Vio su invitación',
  package_selected: 'Eligió paquete',
  payment_open: 'Llegó al pago',
  order_created: 'Creó pedido',
  paid: 'Pagó',
};

export function isFunnelStep(v: unknown): v is FunnelStep {
  return typeof v === 'string' && (FUNNEL_STEPS as readonly string[]).includes(v);
}

export interface FunnelRow { session_id: string; step: string; utm_source: string | null; utm_campaign: string | null; region: string | null; event_type: string | null; package_code: string | null; created_at: string }

/** Sesiones únicas por paso, y por campaña. Puro, para poder probarlo. */
export function summarizeFunnel(rows: FunnelRow[]) {
  const byStep = new Map<FunnelStep, Set<string>>();
  const byCampaign = new Map<string, Map<FunnelStep, Set<string>>>();
  const byType = new Map<string, number>();
  const sessionCampaign = new Map<string, string>();
  // La campaña de una sesión es la del primer evento que la trajo.
  for (const r of [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (!sessionCampaign.has(r.session_id)) sessionCampaign.set(r.session_id, r.utm_campaign ? `${r.utm_source ?? '?'} · ${r.utm_campaign}` : r.utm_source ?? 'directo');
  }
  for (const r of rows) {
    if (!isFunnelStep(r.step)) continue;
    if (!byStep.has(r.step)) byStep.set(r.step, new Set());
    byStep.get(r.step)!.add(r.session_id);
    const camp = sessionCampaign.get(r.session_id) ?? 'directo';
    if (!byCampaign.has(camp)) byCampaign.set(camp, new Map());
    const m = byCampaign.get(camp)!;
    if (!m.has(r.step)) m.set(r.step, new Set());
    m.get(r.step)!.add(r.session_id);
    if (r.step === 'type_selected' && r.event_type) byType.set(r.event_type, (byType.get(r.event_type) ?? 0) + 1);
  }
  const steps = FUNNEL_STEPS.map((step, i) => {
    const n = byStep.get(step)?.size ?? 0;
    const prev = i === 0 ? n : byStep.get(FUNNEL_STEPS[i - 1])?.size ?? 0;
    return { step, sessions: n, keptPct: prev ? Math.round((n / prev) * 100) : null };
  });
  const campaigns = [...byCampaign.entries()].map(([name, m]) => ({
    name,
    landing: m.get('landing_view')?.size ?? 0, store: m.get('store_open')?.size ?? 0, preview: m.get('preview_seen')?.size ?? 0, payment: m.get('payment_open')?.size ?? 0, paid: m.get('paid')?.size ?? 0,
  })).sort((a, b) => b.landing + b.store - (a.landing + a.store));
  return { steps, campaigns, byType: [...byType.entries()].sort((a, b) => b[1] - a[1]) };
}
