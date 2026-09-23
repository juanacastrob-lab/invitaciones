import { notFound } from 'next/navigation';
import { FunnelView } from '@/components/admin/FunnelView';
import { summarizeFunnel, type FunnelRow } from '@/lib/funnel';

export const dynamic = 'force-dynamic';

/** Embudo con datos de mentira. No existe en producción. */
export default async function DevFunnel() {
  if (process.env.NODE_ENV === 'production') notFound();
  const rows: FunnelRow[] = [];
  const steps = ['landing_view', 'store_open', 'type_selected', 'basics_done', 'preview_seen', 'package_selected', 'payment_open', 'order_created', 'paid'];
  const camps = [['facebook', 'bodas-sep', 120, [1, 0.45, 0.8, 0.7, 0.9, 0.5, 0.6, 0.7, 0.8]], ['instagram', 'xv-sep', 60, [1, 0.6, 0.85, 0.8, 0.9, 0.4, 0.5, 0.6, 0.7]], [null, null, 40, [1, 0.3, 0.7, 0.6, 0.9, 0.5, 0.5, 0.5, 1]]] as const;
  let sid = 0;
  for (const [src, camp, n, keep] of camps) {
    for (let i = 0; i < n; i++) {
      const id = `s${sid++}`;
      let alive = 1;
      steps.forEach((step, j) => {
        alive = alive * (j === 0 ? 1 : keep[j]);
        if (Math.random() < alive || j === 0) rows.push({ session_id: id, step, utm_source: src, utm_campaign: camp, region: 'MX', event_type: j >= 2 ? (i % 3 === 0 ? 'xv' : 'boda') : null, package_code: null, created_at: `2026-09-2${(i % 3) + 1}T10:00:00Z` });
      });
    }
  }
  return <main className="mx-auto max-w-5xl bg-stone-50 px-4 py-6"><FunnelView data={summarizeFunnel(rows)} days={7} /></main>;
}
