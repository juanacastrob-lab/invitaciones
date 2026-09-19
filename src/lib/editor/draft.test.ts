import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoEventContent } from '@/demo/demo-event';
import { eventContent, type EventContent } from '@/schemas/event-content';
import { fromDraft, moveSection, toDraft, toggleSection } from './draft';

test('demo → borrador → contenido: no se pierde nada', () => {
  const back = eventContent.safeParse(fromDraft(toDraft(demoEventContent)));
  assert.ok(back.success, back.success ? '' : JSON.stringify(back.error.issues));
  // JSON.stringify tira los undefined, igual que al guardar en JSONB.
  assert.deepEqual(JSON.parse(JSON.stringify(back.data)), JSON.parse(JSON.stringify(demoEventContent)));
});

test('textos vacíos se limpian y las secciones apagadas incompletas se descartan', () => {
  const d = toDraft(demoEventContent);
  d.story.body = { es: '', en: '' };
  d.sectionOrder = toggleSection(d.sectionOrder, 'story', false);
  d.cover.tagline = { es: '  ', en: '' };
  const out = fromDraft(d) as Record<string, unknown>;
  assert.equal(out.story, undefined);
  assert.equal((out.cover as { tagline?: unknown }).tagline, undefined);
  assert.ok(eventContent.safeParse(out).success);
});

test('sección apagada pero completa se conserva', () => {
  const d = toDraft(demoEventContent);
  d.sectionOrder = toggleSection(d.sectionOrder, 'gallery', false);
  const out = eventContent.parse(fromDraft(d));
  assert.ok(out.gallery);
  assert.ok(!out.sectionOrder.includes('gallery'));
});

test('sección visible incompleta falla con la ruta exacta', () => {
  const d = toDraft(demoEventContent);
  d.story.body = { es: '', en: '' };
  const r = eventContent.safeParse(fromDraft(d));
  assert.ok(!r.success);
  assert.equal(r.success ? '' : r.error.issues[0].path.join('.'), 'story.body');
});

test('coordenadas y datos bancarios opcionales', () => {
  const d = toDraft(demoEventContent);
  d.itinerary.acts[0].lat = ' ';
  d.itinerary.acts[0].lng = 'abc';
  d.gifts.bank = { bank: '', holder: '', clabe: '', account: '', note: { es: '', en: '' } };
  const out = eventContent.parse(fromDraft(d)) as EventContent;
  assert.equal(out.itinerary?.acts[0].venue.lat, undefined);
  assert.equal(out.gifts?.bank, undefined);
});

test('orden: mover y encender antes del RSVP', () => {
  assert.deepEqual(moveSection(['cover', 'story', 'rsvp'], 'story', -1), ['story', 'cover', 'rsvp']);
  assert.deepEqual(moveSection(['cover', 'story', 'rsvp'], 'cover', -1), ['cover', 'story', 'rsvp']);
  assert.deepEqual(toggleSection(['cover', 'rsvp'], 'faq', true), ['cover', 'faq', 'rsvp']);
  assert.deepEqual(toggleSection(['cover'], 'rsvp', true), ['cover', 'rsvp']);
});
