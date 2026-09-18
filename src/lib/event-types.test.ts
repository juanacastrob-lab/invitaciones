import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventNames, isEventType, needsTwoNames } from './event-types';

test('nombres del evento', () => {
  assert.equal(eventNames({ partnerA: 'Ana', partnerB: 'Luis' }), 'Ana & Luis');
  assert.equal(eventNames({ partnerA: 'Ana', partnerB: 'Luis' }, ' y '), 'Ana y Luis');
  assert.equal(eventNames({ partnerA: 'Sofía' }), 'Sofía');
  assert.equal(eventNames({ partnerA: 'Sofía', partnerB: null }), 'Sofía');
});

test('tipos', () => {
  assert.ok(isEventType('primera_comunion'));
  assert.ok(!isEventType('fiesta'));
  assert.ok(needsTwoNames('boda'));
  assert.ok(!needsTwoNames('xv'));
});
