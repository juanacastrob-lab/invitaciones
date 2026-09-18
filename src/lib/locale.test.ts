import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLocale } from '@/lib/locale';

const bilingue = { languages: ['es', 'en'], defaultLanguage: 'es' };

test('el switch de la URL manda sobre todo lo demás', () => {
  assert.equal(resolveLocale({ ...bilingue, guestLanguage: 'es', requested: 'en' }), 'en');
});

test('sin switch, se usa el idioma del invitado', () => {
  assert.equal(resolveLocale({ ...bilingue, guestLanguage: 'en' }), 'en');
});

test('sin invitado, se usa el idioma del evento', () => {
  assert.equal(resolveLocale({ languages: ['es', 'en'], defaultLanguage: 'en' }), 'en');
});

test('nunca sale un idioma que el evento no tiene', () => {
  assert.equal(
    resolveLocale({ languages: ['es'], defaultLanguage: 'es', guestLanguage: 'en', requested: 'en' }),
    'es',
  );
});

test('un idioma inventado en la URL no rompe nada', () => {
  assert.equal(resolveLocale({ ...bilingue, requested: 'klingon' }), 'es');
});

test('si el evento quedó mal configurado, se usa el primero que tenga', () => {
  assert.equal(resolveLocale({ languages: ['en'], defaultLanguage: 'fr' }), 'en');
});
