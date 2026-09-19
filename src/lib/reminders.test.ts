import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysUntil, dueMilestone, hoursUntil, parseReminderDays, parseReminderHours, reminderDeadline } from './reminders';

test('hitos: uno por tramo, nunca repetido', () => {
  assert.equal(dueMilestone([7, 3], 10, null), null);
  assert.equal(dueMilestone([7, 3], 7, null), 7);
  assert.equal(dueMilestone([7, 3], 5, null), 7);
  assert.equal(dueMilestone([7, 3], 5, 7), null);
  assert.equal(dueMilestone([7, 3], 3, 7), 3);
  assert.equal(dueMilestone([7, 3], 0, 7), 3);
  assert.equal(dueMilestone([7, 3], 0, 3), null);
  assert.equal(dueMilestone([7, 3], -1, null), null);
  // si nunca se mandó el de 7 y ya estamos a 2 días, va el de 3 (el más cercano), no los dos
  assert.equal(dueMilestone([7, 3], 2, null), 3);
});

test('días que faltan y fecha que manda', () => {
  assert.equal(daysUntil(new Date('2027-03-13T05:59:59Z'), new Date('2027-03-10T12:00:00Z')), 3);
  assert.equal(daysUntil(new Date('2027-03-13T05:59:59Z'), new Date('2027-03-14T12:00:00Z')), -1);
  const withDeadline = reminderDeadline({ rsvp_deadline: '2027-02-13T23:59:59-06:00', startsAt: '2027-03-13T17:00', timezone: 'America/Mexico_City' });
  assert.equal(withDeadline.toISOString(), '2027-02-14T05:59:59.000Z');
  const noDeadline = reminderDeadline({ rsvp_deadline: null, startsAt: '2027-03-13T17:00', timezone: 'America/Mexico_City' });
  assert.equal(noDeadline.toISOString(), '2027-03-13T23:00:00.000Z');
});

test('horas antes del evento con la misma regla de hitos', () => {
  assert.equal(hoursUntil(new Date('2027-03-13T23:00:00Z'), new Date('2027-03-12T00:00:00Z')), 47);
  assert.equal(dueMilestone([48, 24], 47, null), 48);
  assert.equal(dueMilestone([48, 24], 30, 48), null);
  assert.equal(dueMilestone([48, 24], 23, 48), 24);
  assert.equal(dueMilestone([48, 24], -1, 48), null);
  assert.deepEqual(parseReminderHours('24, 48, 999, x'), [48, 24]);
});

test('parseo de días', () => {
  assert.deepEqual(parseReminderDays('3, 7,7 x 14'), [14, 7, 3]);
  assert.deepEqual(parseReminderDays(''), []);
});
