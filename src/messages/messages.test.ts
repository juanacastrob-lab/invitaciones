import { test } from 'node:test';
import assert from 'node:assert/strict';
import es from '@/messages/es.json' with { type: 'json' };
import en from '@/messages/en.json' with { type: 'json' };

/** Todas las rutas de claves de un objeto de mensajes, en orden. */
function keyPaths(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>)
    .flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k))
    .sort();
}

test('español e inglés tienen exactamente las mismas claves', () => {
  const soloEs = keyPaths(es).filter((k) => !keyPaths(en).includes(k));
  const soloEn = keyPaths(en).filter((k) => !keyPaths(es).includes(k));

  assert.deepEqual(
    { soloEs, soloEn },
    { soloEs: [], soloEn: [] },
    'Una clave que existe en un idioma y no en el otro sale como texto crudo en la invitación.',
  );
});

test('ningún texto quedó vacío', () => {
  const vacios: string[] = [];
  const revisar = (obj: unknown, idioma: string, prefix = '') => {
    if (typeof obj === 'string') {
      if (obj.trim() === '') vacios.push(`${idioma}:${prefix}`);
      return;
    }
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) revisar(v, idioma, prefix ? `${prefix}.${k}` : k);
    }
  };
  revisar(es, 'es');
  revisar(en, 'en');
  assert.deepEqual(vacios, []);
});

test('los plurales usan el formato ICU que entiende next-intl', () => {
  const plurales = [es.invitation.guestBanner.passes, en.invitation.guestBanner.passes];
  for (const p of plurales) {
    assert.match(p, /\{count, plural,/, `"${p}" no es un plural ICU`);
    assert.match(p, /one \{/);
    assert.match(p, /other \{/);
  }
});
