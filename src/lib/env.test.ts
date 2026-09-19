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

test('en producción los links siempre son del dominio real', async () => {
  const { resolveSiteUrl } = await import('./env');
  assert.equal(resolveSiteUrl({ configured: 'https://holaboda.netlify.app', context: 'production' }), 'https://holaboda.mx');
  assert.equal(resolveSiteUrl({ configured: undefined, context: 'production' }), 'https://holaboda.mx');
  assert.equal(resolveSiteUrl({ configured: 'https://holaboda.mx', context: 'production' }), 'https://holaboda.mx');
  assert.equal(resolveSiteUrl({ configured: 'https://dev--holaboda.netlify.app', context: 'branch-deploy' }), 'https://dev--holaboda.netlify.app');
  assert.equal(resolveSiteUrl({ configured: undefined, context: 'branch-deploy', deployUrl: 'https://dev--holaboda.netlify.app' }), 'https://dev--holaboda.netlify.app');
  assert.equal(resolveSiteUrl({}), undefined);
});
