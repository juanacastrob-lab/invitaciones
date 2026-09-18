\set ON_ERROR_STOP on
\pset pager off
\set QUIET on

-- Requiere 001..014 sobre el shim. Prueba quién puede guardar contenido.

create or replace function t_check(nombre text, esperado text, obtenido text)
returns void language plpgsql as $$
begin
  if esperado = obtenido then raise notice '  OK   % (%)', nombre, obtenido;
  else raise notice '  FALLA % -> esperaba %, obtuvo %', nombre, esperado, obtenido; end if;
end;
$$;

create or replace function t_try(q text)
returns text language plpgsql as $$
begin
  execute q; return 'ok';
exception when others then return sqlerrm;
end;
$$;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin@test.mx'),
  ('22222222-2222-2222-2222-222222222222', 'staff@test.mx'),
  ('33333333-3333-3333-3333-333333333333', 'novios@test.mx'),
  ('44444444-4444-4444-4444-444444444444', 'ajeno@test.mx');
update profiles set role = 'admin' where user_id = '11111111-1111-1111-1111-111111111111';
update profiles set role = 'staff' where user_id = '22222222-2222-2222-2222-222222222222';

insert into events (id, slug, status, created_by) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'borrador-a', 'borrador',  '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'publicada-b', 'publicado', '11111111-1111-1111-1111-111111111111');
insert into event_members (event_id, user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333');

\echo ''
\echo '--- novios: guardan en borrador, no en publicado ---'
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  select t_check('borrador', 'ok',
    t_try($q$select rpc_update_event_content('aaaaaaaa-0000-0000-0000-000000000001', '{"version":1,"x":"novios"}')$q$));
  select t_check('quedó guardado', 'novios',
    (select content->>'x' from events where id = 'aaaaaaaa-0000-0000-0000-000000000001'));
  select t_check('publicado', 'La invitación ya está publicada: los cambios los hace el equipo.',
    t_try($q$select rpc_update_event_content('aaaaaaaa-0000-0000-0000-000000000002', '{"version":1}')$q$));
  select t_check('no es objeto', 'Contenido inválido.',
    t_try($q$select rpc_update_event_content('aaaaaaaa-0000-0000-0000-000000000001', '[1,2]')$q$));
  reset role; -- la bitácora solo la lee el equipo
  select t_check('bitácora', '1',
    (select count(*)::text from activity_log where entity_id = 'aaaaaaaa-0000-0000-0000-000000000001' and action = 'update_content'));
rollback;

\echo ''
\echo '--- ajeno: nada; staff: todo ---'
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  select t_check('ajeno borrador', 'Sin acceso a este evento.',
    t_try($q$select rpc_update_event_content('aaaaaaaa-0000-0000-0000-000000000001', '{"version":1}')$q$));
  select t_check('evento inexistente', 'Sin acceso a este evento.',
    t_try($q$select rpc_update_event_content('aaaaaaaa-0000-0000-0000-000000000009', '{"version":1}')$q$));
rollback;
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  select t_check('staff publicado', 'ok',
    t_try($q$select rpc_update_event_content('aaaaaaaa-0000-0000-0000-000000000002', '{"version":1,"x":"staff"}')$q$));
rollback;
begin;
  set local role anon;
  select t_check('anon', 'permission denied for function rpc_update_event_content',
    t_try($q$select rpc_update_event_content('aaaaaaaa-0000-0000-0000-000000000001', '{"version":1}')$q$));
rollback;

\echo ''
\echo '--- tipos de evento nuevos ---'
select t_check('primera_comunion', 'ok', t_try($q$select 'primera_comunion'::event_type$q$));
select t_check('confirmacion', 'ok', t_try($q$select 'confirmacion'::event_type$q$));
