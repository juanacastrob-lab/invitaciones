import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dropEmptySections } from './invitation-content';

test('quita del orden las secciones sin contenido y deja las que no lo necesitan', () => {
  const data = { event: { content: { sectionOrder: ['cover', 'quote', 'countdown', 'parents', 'story', 'rsvp'], story: { body: { es: 'x' } } } } };
  const out = dropEmptySections(data) as { event: { content: { sectionOrder: string[] } } };
  assert.deepEqual(out.event.content.sectionOrder, ['cover', 'countdown', 'story', 'rsvp']);
});

test('sin cambios devuelve null', () => {
  assert.equal(dropEmptySections({ event: { content: { sectionOrder: ['cover', 'rsvp'] } } }), null);
  assert.equal(dropEmptySections(null), null);
});
