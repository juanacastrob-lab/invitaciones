/**
 * Genera supabase/migrations/002_demo_event.sql a partir del contenido demo.
 *
 * El SQL no se escribe a mano: se deriva del mismo objeto que valida Zod, para
 * que el contenido de la base y el que espera la app nunca se separen.
 *
 *   npm run build:demo-seed
 */
import { writeFileSync } from 'node:fs';
import { eventContent } from '@/schemas/event-content';
import { DEMO_SLUG, demoEventContent, demoGuests } from '@/demo/demo-event';

const parsed = eventContent.safeParse(demoEventContent);
if (!parsed.success) {
  console.error('El contenido demo no pasa la validación:');
  console.error(JSON.stringify(parsed.error.issues, null, 2));
  process.exit(1);
}

const json = JSON.stringify(parsed.data, null, 2);
if (json.includes('$demo$')) throw new Error('El contenido choca con el delimitador.');

const sqlText = (v: string) => `'${v.replace(/'/g, "''")}'`;

const guestRows = demoGuests
  .map(
    (g) =>
      `    (${sqlText(g.display_name)}, ${g.passes}, ${sqlText(g.language)}, ${sqlText(g.group_tag)})`,
  )
  .join(',\n');

const sql = `-- =============================================================================
-- 002_demo_event.sql — Evento demo para los anuncios
--
-- GENERADO AUTOMÁTICAMENTE. No editar a mano:
--   se escribe desde src/demo/demo-event.ts con \`npm run build:demo-seed\`.
--
-- Pareja, lugares y fotos son ficticios, así que se puede enseñar y compartir
-- sin permiso de ningún cliente. Correrlo dos veces no duplica nada.
-- =============================================================================

insert into events (
  slug, type, template, languages, default_language, timezone, status,
  content, rsvp_deadline, allow_public_rsvp, show_private_gifts
)
values (
  ${sqlText(DEMO_SLUG)},
  'boda',
  'aurora',
  '{es,en}',
  'es',
  'America/Mexico_City',
  'publicado',
  $demo$${json}$demo$::jsonb,
  '2027-02-13 23:59:59-06',
  false,
  true
)
on conflict (slug) do update
  set content   = excluded.content,
      languages = excluded.languages,
      status    = excluded.status;

-- Invitados de prueba, con pases variados para enseñar los distintos casos.
-- El token de cada uno lo genera la base: aleatorio y no adivinable.
insert into guests (event_id, display_name, passes, language, group_tag)
select e.id, v.display_name, v.passes, v.language, v.group_tag
from events e
cross join (
  values
${guestRows}
) as v(display_name, passes, language, group_tag)
where e.slug = ${sqlText(DEMO_SLUG)}
  and not exists (
    select 1 from guests g where g.event_id = e.id and g.display_name = v.display_name
  );

-- Los links personales de cada invitado. Guarda el de "Invitado de muestra":
-- ese es el que puedes poner en los anuncios.
select
  g.display_name as invitado,
  g.passes       as pases,
  g.language     as idioma,
  '/i/' || e.slug || '/' || g.token as link
from guests g
join events e on e.id = g.event_id
where e.slug = ${sqlText(DEMO_SLUG)}
order by g.passes desc, g.display_name;
`;

writeFileSync('supabase/migrations/002_demo_event.sql', sql);
console.log(`002_demo_event.sql escrito (${sql.split('\n').length} líneas)`);
