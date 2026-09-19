import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkinTotals, tokenFromScan } from './checkin';

test('token desde el QR', () => {
  assert.equal(tokenFromScan('https://holaboda.mx/i/juan-y-ana/AbC123xyz_-?lang=en', 'juan-y-ana'), 'AbC123xyz_-');
  assert.equal(tokenFromScan('https://holaboda.mx/i/otra-boda/AbC123xyz', 'juan-y-ana'), null);
  assert.equal(tokenFromScan('hola', 'juan-y-ana'), null);
  assert.equal(tokenFromScan('https://holaboda.mx/i/juan-y-ana', 'juan-y-ana'), null);
});

test('totales de llegada', () => {
  const t = checkinTotals([
    { passes: 4, confirmed_count: 3, checked_in_at: 'x', checked_in_count: 3, status: 'confirmed' },
    { passes: 2, confirmed_count: 2, checked_in_at: null, checked_in_count: 0, status: 'confirmed' },
    { passes: 1, confirmed_count: 0, checked_in_at: null, checked_in_count: 0, status: 'pending' },
  ]);
  assert.deepEqual(t, { expected: 5, arrivedGroups: 1, arrivedPeople: 3, confirmedGroups: 2 });
});
