\set ON_ERROR_STOP on
\pset pager off
\set QUIET on

create or replace function t_check(nombre text, esperado text, obtenido text)
returns void language plpgsql as $$
begin
  if esperado = obtenido then raise notice '  OK   % (%)', nombre, obtenido;
  else raise notice '  FALLA % -> esperaba %, obtuvo %', nombre, esperado, obtenido; end if;
end;
$$;

insert into auth.users (id, email) values ('33333333-3333-3333-3333-333333333333', 'novios@test.mx'), ('44444444-4444-4444-4444-444444444444', 'ajeno@test.mx');
insert into events (id, slug, status, content) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'album-on', 'publicado', '{"version":1,"album":{"enabled":true}}'::jsonb),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'album-off', 'publicado', '{"version":1}'::jsonb);
insert into event_members (event_id, user_id) values ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333');

\echo ''
\echo '--- álbum ---'
begin;
  set local role service_role;
  select t_check('apagado = nada', 'null', coalesce((select rpc_album_list('album-off')::text), 'null'));
  select t_check('encendido lista vacía', '0', (select jsonb_array_length(rpc_album_list('album-on') -> 'photos')::text));
  select t_check('agregar foto', 'true', (select rpc_album_add('album-on', 'events/aaaaaaaa-0000-0000-0000-000000000001/album/abc123.webp', '  Tía Lupe  ', null, 'k1') ->> 'ok'));
  select t_check('ruta de otro evento', 'invalid_path', (select rpc_album_add('album-on', 'events/aaaaaaaa-0000-0000-0000-000000000002/album/abc.webp', null, null, 'k1') ->> 'error'));
  select t_check('ruta rara', 'invalid_path', (select rpc_album_add('album-on', 'events/aaaaaaaa-0000-0000-0000-000000000001/../x.webp', null, null, 'k1') ->> 'error'));
  select t_check('álbum apagado no acepta', 'closed', (select rpc_album_add('album-off', 'events/aaaaaaaa-0000-0000-0000-000000000002/album/abc.webp', null, null, 'k1') ->> 'error'));
  select t_check('lista trae la foto con nombre recortado', 'Tía Lupe', (select rpc_album_list('album-on') -> 'photos' -> 0 ->> 'uploader'));
rollback;
begin;
  set local role service_role;
  select rpc_album_add('album-on', 'events/aaaaaaaa-0000-0000-0000-000000000001/album/abc123.webp', 'X', null, 'k2');
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  select t_check('ajeno no ve fotos', '0', (select count(*)::text from event_photos));
  select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  select t_check('novios ven', '1', (select count(*)::text from event_photos));
  delete from event_photos;
  select t_check('novios borran', '0', (select count(*)::text from event_photos));
rollback;
