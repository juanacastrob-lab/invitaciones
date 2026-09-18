import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES, TEMPLATE_IDS, resolveTemplate, templateCssVars } from './registry';

test('todas las plantillas tienen colores válidos y nombres en los dos idiomas', () => {
  for (const id of TEMPLATE_IDS) {
    const t = TEMPLATES[id];
    assert.equal(t.id, id);
    for (const c of Object.values(t.colors)) assert.match(c, /^#[0-9a-f]{6}$/i, `${id}: ${c}`);
    assert.ok(t.name.es && t.name.en && t.description.es && t.description.en);
  }
});

test('un id desconocido cae en aurora', () => {
  assert.equal(resolveTemplate('lo-que-sea').id, 'aurora');
  assert.equal(resolveTemplate(null).id, 'aurora');
  assert.equal(resolveTemplate('noche').id, 'noche');
  assert.equal((templateCssVars(TEMPLATES.noche) as Record<string, string>)['--paper'], '#14161c');
});
