import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extFromMime, mediaPath, publicMediaUrl } from './media';

test('rutas y URLs públicas de Storage', () => {
  assert.equal(mediaPath('ev1', 'webp', 'abc'), 'events/ev1/abc.webp');
  assert.equal(publicMediaUrl('https://x.supabase.co/', 'events/ev1/abc.webp'), 'https://x.supabase.co/storage/v1/object/public/event-media/events/ev1/abc.webp');
  assert.equal(extFromMime('image/jpeg'), 'jpg');
  assert.equal(extFromMime('image/gif'), null);
});
