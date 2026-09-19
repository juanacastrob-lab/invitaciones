import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWebhook, withinServiceWindow, phoneKey, displayPhone } from './inbox';

const payload = {
  object: 'whatsapp_business_account',
  entry: [{ changes: [{ field: 'messages', value: {
    contacts: [{ wa_id: '5215512345678', profile: { name: 'Sofía' } }],
    messages: [
      { id: 'wamid.1', from: '5215512345678', timestamp: '1700000000', type: 'text', text: { body: 'Hola' } },
      { id: 'wamid.2', from: '5215512345678', timestamp: '1700000001', type: 'image', image: { id: 'media9', caption: 'mi vestido' } },
      { id: 'wamid.3', from: '5215512345678', timestamp: '1700000002', type: 'reaction', reaction: { emoji: '❤️' } },
    ],
    statuses: [{ id: 'wamid.out1', status: 'read' }, { id: 'wamid.out2', status: 'failed', errors: [{ title: 'Fuera de ventana' }] }],
  } }] }],
};

test('saca texto, media y estados; ignora reacciones', () => {
  const { messages, statuses } = parseWebhook(payload);
  assert.equal(messages.length, 2);
  assert.deepEqual({ ...messages[0], timestamp: undefined }, { waId: 'wamid.1', from: '5215512345678', name: 'Sofía', body: 'Hola', mediaType: null, mediaId: null, timestamp: undefined });
  assert.equal(messages[1].mediaType, 'image');
  assert.equal(messages[1].mediaId, 'media9');
  assert.equal(messages[1].body, 'mi vestido');
  assert.equal(messages[0].timestamp.toISOString(), '2023-11-14T22:13:20.000Z');
  assert.deepEqual(statuses, [{ waId: 'wamid.out1', status: 'read', error: null }, { waId: 'wamid.out2', status: 'failed', error: 'Fuera de ventana' }]);
});

test('payload ajeno o vacío no truena', () => {
  assert.deepEqual(parseWebhook({ object: 'page' }), { messages: [], statuses: [] });
  assert.deepEqual(parseWebhook(null), { messages: [], statuses: [] });
});

test('ventana de 24 h', () => {
  const now = new Date('2026-01-01T12:00:00Z');
  assert.equal(withinServiceWindow('2026-01-01T00:00:00Z', now), true);
  assert.equal(withinServiceWindow('2025-12-31T11:00:00Z', now), false);
  assert.equal(withinServiceWindow(null, now), false);
});

test('cruce de teléfonos MX con y sin el 1', () => {
  assert.equal(phoneKey('+5215512345678'), '525512345678');
  assert.equal(phoneKey('525512345678'), '525512345678');
  assert.equal(phoneKey('+1 (555) 123-4567'), '15551234567');
  assert.equal(displayPhone('5215512345678'), '+52 55 1234 5678');
});
