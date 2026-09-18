import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceOrder, orderInput } from '@/schemas/order';

const pkg = { code: 'completo', name: 'Completo', price: 4800 };
const extras = [
  { code: 'musica', name: 'Música', price: 300, included_in: ['completo', 'premium'] },
  { code: 'qr_checkin', name: 'QR', price: 800, included_in: ['premium'] },
  { code: 'dominio_propio', name: 'Dominio', price: 1200, included_in: [] },
];

test('suma paquete + extras elegidos', () => {
  const r = priceOrder(pkg, extras, ['qr_checkin', 'dominio_propio']);
  assert.equal(r.total, 6800);
  assert.deepEqual(r.lines.map((l) => l.code), ['qr_checkin', 'dominio_propio']);
});

test('no cobra un extra que el paquete ya incluye', () => {
  const r = priceOrder(pkg, extras, ['musica', 'qr_checkin']);
  assert.equal(r.total, 5600);
  assert.ok(!r.lines.some((l) => l.code === 'musica'));
});

test('ignora códigos de extras que no existen', () => {
  assert.equal(priceOrder(pkg, extras, ['inventado']).total, 4800);
});

const base = {
  packageCode: 'completo', buildMode: 'team', partnerA: 'Juan', partnerB: 'Ana', email: 'a@b.mx',
  phone: '56 6297 4440', country: 'MX', paymentMethod: 'transfer', locale: 'es', consent: true,
} as const;

test('con planner hace falta su correo', () => {
  const r = orderInput.safeParse({ ...base, buildMode: 'planner', plannerEmail: '' });
  assert.equal(r.success, false);
  assert.ok(!r.success && r.error.issues.some((i) => i.message === 'planner_email_required'));
});

test('con tarjeta simulada hacen falta los datos de la tarjeta', () => {
  assert.equal(orderInput.safeParse({ ...base, paymentMethod: 'card_sim' }).success, false);
  assert.ok(orderInput.safeParse({ ...base, paymentMethod: 'card_sim', card: { number: '4242424242424242', exp: '12/28', cvc: '123', name: 'Juan' } }).success);
});

test('un solo nombre es válido (cumpleaños, graduación)', () => {
  assert.ok(orderInput.safeParse({ ...base, partnerB: '' }).success);
});
