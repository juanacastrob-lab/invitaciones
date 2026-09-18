import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderGuestEmail } from './guest-email';

test('correo al invitado: asunto por plantilla, botón con el link y HTML escapado', () => {
  const link = 'https://holaboda.mx/i/ana-y-luis/tok123';
  const r = renderGuestEmail({ templateKey: 'invite', locale: 'es', couple: 'Ana & Luis', message: `Hola <Pepe>\n\nAquí está tu invitación:\n${link}\n\n¡Te esperamos!`, link, appName: 'Hola Boda' });
  assert.equal(r.subject, 'Ana & Luis: tu invitación');
  assert.ok(r.html.includes(`href="${link}"`));
  assert.ok(r.html.includes('Hola &lt;Pepe&gt;'));
  assert.ok(r.html.includes('Ana &amp; Luis'));
  assert.ok(!r.html.includes('<Pepe>'));
  assert.ok(r.text.includes(link));
  const en = renderGuestEmail({ templateKey: 'reminder_pending', locale: 'en', couple: 'Ana & Luis', message: 'x', link, appName: 'Hola Boda' });
  assert.equal(en.subject, 'Ana & Luis: can you RSVP?');
  assert.ok(en.html.includes('Open my invitation'));
});
