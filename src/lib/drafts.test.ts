import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draftData, draftToContent, draftMissing, draftStartsAt, EMPTY_DRAFT } from './drafts';
import { eventContent as eventContentSchema } from '@/schemas/event-content';

const d = draftData.parse({
  template: 'jardin', colors: { accent: '#b8674a' }, eventType: 'boda', partnerA: 'Ana', partnerB: 'Luis', date: '2027-03-13',
  acts: [{ kind: 'religiosa', title: '', time: '17:00', venue: 'Parroquia', address: 'Centro', mapsUrl: 'https://maps.app.goo.gl/x' }, { kind: 'recepcion', title: 'Fiesta', time: '20:00', venue: 'Hacienda', address: '' }],
  parentsA: 'María Castillo\nRoberto Basurto', parentsB: 'Lupe, Antonio', photos: ['https://x/a.jpg', 'https://x/b.jpg'], dressCode: 'Formal', message: 'Acompáñanos', giftsNote: 'Liverpool evento 123',
});

test('el borrador se vuelve contenido válido', () => {
  const c = draftToContent(d);
  assert.ok(eventContentSchema.safeParse(c).success, JSON.stringify(eventContentSchema.safeParse(c).error?.issues));
  assert.deepEqual(c.sectionOrder, ['cover', 'countdown', 'parents', 'itinerary', 'dressCode', 'gifts', 'gallery', 'rsvp']);
  assert.equal(c.startsAt, '2027-03-13T17:00');
  assert.equal(c.itinerary?.acts[1].startsAt, '2027-03-13T20:00');
  assert.equal(c.itinerary?.acts[0].title.es, 'Ceremonia religiosa');
  assert.equal(c.itinerary?.acts[0].venue.mapsUrl, 'https://maps.app.goo.gl/x');
  assert.deepEqual(c.parents?.groups.map((g) => g.names), [['María Castillo', 'Roberto Basurto'], ['Lupe', 'Antonio']]);
  assert.equal(c.gifts?.links.length, 0);
  assert.equal(c.colors?.accent, '#b8674a');
  assert.equal(c.og?.image, 'https://x/a.jpg');
});

test('vacío también es válido y no lista secciones sin contenido', () => {
  const c = draftToContent(EMPTY_DRAFT);
  assert.ok(eventContentSchema.safeParse(c).success);
  assert.deepEqual(c.sectionOrder, ['cover', 'countdown', 'rsvp']);
  assert.deepEqual(draftMissing(EMPTY_DRAFT), ['names', 'date', 'venue']);
  assert.deepEqual(draftMissing(d), []);
  assert.match(draftStartsAt(EMPTY_DRAFT), /T17:00$/);
});
