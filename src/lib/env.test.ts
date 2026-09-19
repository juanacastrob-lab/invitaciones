import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSiteUrl } from '@/lib/env';

test('acepta la URL escrita sin https://', () => {
  assert.equal(normalizeSiteUrl('holaboda.mx'), 'https://holaboda.mx');
});

test('quita la diagonal final y espacios', () => {
  assert.equal(normalizeSiteUrl('  https://holaboda.mx/  '), 'https://holaboda.mx');
});

test('respeta una URL bien escrita', () => {
  assert.equal(normalizeSiteUrl('https://dev--holaboda.netlify.app'), 'https://dev--holaboda.netlify.app');
});

test('vacía o basura no truena, se omite', () => {
  assert.equal(normalizeSiteUrl(''), undefined);
  assert.equal(normalizeSiteUrl(undefined), undefined);
  assert.equal(normalizeSiteUrl('esto no es una url ni de chiste'), undefined);
});
