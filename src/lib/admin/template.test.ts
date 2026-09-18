import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventContent } from '@/schemas/event-content';
import { EVENT_TYPES } from '@/lib/event-types';
import { slugFromNames, templateContent } from './template';

test('la plantilla de cada tipo pasa la validación', () => {
  for (const type of EVENT_TYPES) {
    const c = templateContent({ partnerA: 'Sofía', partnerB: type === 'boda' ? 'Luis' : undefined, startsAt: '2027-06-12T13:00', type });
    const r = eventContent.safeParse(c);
    assert.ok(r.success, `${type}: ${r.success ? '' : JSON.stringify(r.error.issues)}`);
    assert.equal(c.couple.partnerB, type === 'boda' ? 'Luis' : undefined);
    assert.ok(c.itinerary && c.itinerary.acts.length >= 1);
    assert.equal(c.itinerary?.acts[0].startsAt, '2027-06-12T13:00');
  }
});

test('boda: tres actos escalonados y sin niños; XV: misa y fiesta', () => {
  const boda = templateContent({ partnerA: 'Ana', partnerB: 'Luis', startsAt: '2027-03-13T17:00', type: 'boda' });
  assert.deepEqual(boda.itinerary?.acts.map((a) => a.startsAt), ['2027-03-13T17:00', '2027-03-13T18:30', '2027-03-13T20:00']);
  assert.ok(boda.noKids);
  assert.equal(boda.og?.title?.es, 'Ana & Luis');
  const xv = templateContent({ partnerA: 'Sofía', startsAt: '2027-06-12T13:00', type: 'xv' });
  assert.equal(xv.cover?.headline?.es, 'Mis XV años');
  assert.equal(xv.noKids, undefined);
  assert.equal(xv.og?.title?.es, 'Sofía');
});

test('slug desde nombres', () => {
  assert.equal(slugFromNames('Ana María', 'Luis', 'k3f2'), 'ana-maria-y-luis-k3f2');
  assert.equal(slugFromNames('Sofía', undefined, 'ab12'), 'sofia-ab12');
});
