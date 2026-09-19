import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leadInput, normalizePhone } from '@/schemas/lead';

const base = {
  partnerA: 'Juan Antonio',
  partnerB: 'Ana Marcela',
  email: 'Juan@Ejemplo.com',
  phone: '56 6297 4440',
  country: 'MX',
  language: 'es',
  locale: 'es',
  consent: true,
} as const;

test('un celular mexicano escrito con espacios queda en E.164', () => {
  assert.equal(normalizePhone('56 6297 4440', 'MX'), '+525662974440');
  assert.equal(normalizePhone('(415) 867-5309', 'US'), '+14158675309');
  assert.equal(normalizePhone('(604) 200-1234', 'CA'), '+16042001234');
});

test('un teléfono que no existe se rechaza', () => {
  assert.equal(normalizePhone('123', 'MX'), null);
  const r = leadInput.safeParse({ ...base, phone: '123' });
  assert.equal(r.success, false);
  assert.ok(!r.success && r.error.issues.some((i) => i.path[0] === 'phone'));
});

test('el correo se guarda en minúsculas', () => {
  const r = leadInput.safeParse(base);
  assert.ok(r.success);
  assert.equal(r.data.email, 'juan@ejemplo.com');
});

test('sin consentimiento no pasa', () => {
  assert.equal(leadInput.safeParse({ ...base, consent: false }).success, false);
});

test('la fecha puede venir vacía', () => {
  assert.ok(leadInput.safeParse({ ...base, eventDate: '' }).success);
  assert.ok(leadInput.safeParse({ ...base, eventDate: '2027-03-13' }).success);
  assert.equal(leadInput.safeParse({ ...base, eventDate: '13/03/2027' }).success, false);
});
