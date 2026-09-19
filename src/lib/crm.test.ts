import { test } from 'node:test';
import assert from 'node:assert/strict';
import { followUpState, daysSince } from './crm';

test('estado del seguimiento', () => {
  const today = new Date('2026-09-19T15:00:00Z');
  assert.equal(followUpState(null, today), 'none');
  assert.equal(followUpState('2026-09-18', today), 'overdue');
  assert.equal(followUpState('2026-09-19', today), 'today');
  assert.equal(followUpState('2026-09-20', today), 'upcoming');
});

test('días desde', () => {
  assert.equal(daysSince('2026-09-16T00:00:00Z', new Date('2026-09-19T00:00:00Z')), 3);
  assert.equal(daysSince(null), null);
});
