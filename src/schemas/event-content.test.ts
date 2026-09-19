import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventContent, pickText, type EventContent } from '@/schemas/event-content';
import { demoEventContent } from '@/demo/demo-event';

test('el contenido del evento demo es válido', () => {
  const result = eventContent.safeParse(demoEventContent);
  assert.equal(
    result.success,
    true,
    result.success ? '' : JSON.stringify(result.error.issues, null, 2),
  );
});

test('el demo está completo en español y en inglés', () => {
  const faltantes: string[] = [];

  const revisar = (valor: unknown, ruta: string) => {
    if (valor === null || typeof valor !== 'object') return;
    if (Array.isArray(valor)) {
      valor.forEach((v, i) => revisar(v, `${ruta}[${i}]`));
      return;
    }
    const obj = valor as Record<string, unknown>;
    const claves = Object.keys(obj);
    // Un texto localizado: solo tiene claves de idioma.
    const esTexto = claves.length > 0 && claves.every((k) => k === 'es' || k === 'en');
    if (esTexto) {
      if (!obj.es) faltantes.push(`${ruta} (falta es)`);
      if (!obj.en) faltantes.push(`${ruta} (falta en)`);
      return;
    }
    for (const [k, v] of Object.entries(obj)) revisar(v, `${ruta}.${k}`);
  };

  revisar(demoEventContent, 'content');
  assert.deepEqual(faltantes, [], `Textos sin traducir:\n${faltantes.join('\n')}`);
});

test('pickText cae al otro idioma antes que dejar un hueco', () => {
  assert.equal(pickText({ es: 'Hola' }, 'en'), 'Hola');
  assert.equal(pickText({ es: 'Hola', en: 'Hi' }, 'en'), 'Hi');
  assert.equal(pickText(undefined, 'es'), undefined);
});

test('rechaza una sección anunciada pero vacía', () => {
  const roto = {
    ...demoEventContent,
    sectionOrder: [...demoEventContent.sectionOrder, 'music'],
  } as EventContent;

  const result = eventContent.safeParse(roto);
  assert.equal(result.success, false);
  assert.match(
    result.success ? '' : result.error.issues.map((i) => i.message).join(' '),
    /music/,
  );
});

test('rechaza preguntar el menú sin opciones de menú', () => {
  const roto = {
    ...demoEventContent,
    rsvp: { ...demoEventContent.rsvp!, askMenu: true, menuOptions: [] },
  };

  assert.equal(eventContent.safeParse(roto).success, false);
});

test('rechaza un texto que no está en ningún idioma', () => {
  const roto = {
    ...demoEventContent,
    cover: { ...demoEventContent.cover, headline: {} },
  };

  assert.equal(eventContent.safeParse(roto).success, false);
});

test('rechaza una fecha con formato de otro país', () => {
  const roto = { ...demoEventContent, startsAt: '13/03/2027 17:00' };
  assert.equal(eventContent.safeParse(roto).success, false);
});
