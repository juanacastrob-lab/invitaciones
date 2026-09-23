import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeFunnel, type FunnelRow } from './funnel';

const r = (session_id: string, step: string, extra: Partial<FunnelRow> = {}): FunnelRow => ({ session_id, step, utm_source: null, utm_campaign: null, region: 'MX', event_type: null, package_code: null, created_at: '2026-09-23T10:00:00Z', ...extra });

test('sesiones únicas por paso y retención', () => {
  const rows = [
    r('a', 'landing_view', { utm_source: 'facebook', utm_campaign: 'bodas-sep', created_at: '2026-09-23T09:00:00Z' }), r('a', 'store_open'), r('a', 'type_selected', { event_type: 'boda' }), r('a', 'preview_seen'),
    r('b', 'landing_view'), r('b', 'store_open'), r('b', 'store_open'),
    r('c', 'store_open'), r('c', 'type_selected', { event_type: 'xv' }), r('c', 'basics_done'), r('c', 'preview_seen'), r('c', 'package_selected'), r('c', 'payment_open'), r('c', 'order_created'), r('c', 'paid'),
  ];
  const s = summarizeFunnel(rows);
  assert.deepEqual(s.steps.map((x) => x.sessions), [2, 3, 2, 1, 2, 1, 1, 1, 1]);
  assert.equal(s.steps[2].keptPct, 67);
  assert.equal(s.campaigns.find((c) => c.name === 'facebook · bodas-sep')?.preview, 1);
  assert.equal(s.campaigns.find((c) => c.name === 'directo')?.paid, 1);
  assert.deepEqual(s.byType, [['boda', 1], ['xv', 1]]);
});
