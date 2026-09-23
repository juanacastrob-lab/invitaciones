import { test } from 'node:test';
import assert from 'node:assert/strict';
import { regionFromRequest } from './region';

const H = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });

test('la cookie manda', () => {
  assert.equal(regionFromRequest({ cookie: 'US', headers: H({ 'x-nf-geo': Buffer.from('{"country":{"code":"MX"}}').toString('base64') }) }), 'US');
});
test('geo de Netlify: Canadá compra en EE. UU.', () => {
  assert.equal(regionFromRequest({ headers: H({ 'x-nf-geo': Buffer.from('{"country":{"code":"CA"}}').toString('base64') }) }), 'US');
  assert.equal(regionFromRequest({ headers: H({ 'x-nf-geo': Buffer.from('{"country":{"code":"MX"}}').toString('base64') }) }), 'MX');
});
test('sin geo, por idioma; sin nada, México', () => {
  assert.equal(regionFromRequest({ headers: H({ 'accept-language': 'en-US,en;q=0.9' }) }), 'US');
  assert.equal(regionFromRequest({ headers: H({ 'accept-language': 'es-MX' }) }), 'MX');
  assert.equal(regionFromRequest({ headers: H({}) }), 'MX');
  assert.equal(regionFromRequest({ headers: H({ 'x-nf-geo': 'basura' }) }), 'MX');
});
