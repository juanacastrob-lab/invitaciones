\set ON_ERROR_STOP on
\pset pager off
\set QUIET on

-- Requiere 001..013 aplicadas sobre el shim. Prueba mesas y que las vistas
-- event_stats / table_stats respeten RLS (security_invoker).

create or replace function t_check(nombre text, esperado text, obtenido text)
returns void language plpgsql as $$
begin
  if esperado = obtenido then
    raise notice '  OK   % (%)', nombre, obtenido;
  else
    raise notice '  FALLA % -> esperaba %, obtuvo %', nombre, esperado, obtenido;
  end if;
end;
$$;

create or replace function t_count(q text)
returns text language plpgsql as $$
declare n bigint;
begin
  execute q into n;
  return n::text;
exception when insufficient_privilege then
  return 'sin-permiso';
end;
$$;

-- ejecuta y devuelve 'ok' o el mensaje de error
create or replace function t_try(q text)
returns text language plpgsql as $$
begin
  execute q;
  return 'ok';
exception when others then
  return sqlerrm;
end;
$$;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin@test.mx'),
  ('33333333-3333-3333-3333-333333333333', 'novios@test.mx'),
  ('44444444-4444-4444-4444-444444444444', 'ajeno@test.mx');
update profiles set role = 'admin' where user_id = '11111111-1111-1111-1111-111111111111';

insert into events (id, slug, status, created_by) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'boda-a', 'publicado', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'boda-b', 'publicado', '11111111-1111-1111-1111-111111111111');
insert into event_members (event_id, user_id)
values ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333');

insert into event_tables (id, event_id, name, capacity) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Mesa 1', 10),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Mesa 2', 10),
  ('bbbbbbbb-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000002', 'Mesa X', 8);

insert into guests (id, event_id, display_name, passes, confirmed_count) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Familia Lopez', 4, 3),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Mariana Ruiz',  2, 0),
  ('cccccccc-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000002', 'Ajeno', 1, 0);

\echo ''
\echo '--- novios: asignan mesa aunque el evento ya esta publicado ---'
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  select t_check('asignar mesa 1', 'ok',
    t_try($q$select rpc_assign_table('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001')$q$));
  select t_check('table_no sincronizado', 'Mesa 1',
    (select table_no from guests where id = 'cccccccc-0000-0000-0000-000000000001'));
  select t_check('mesa de otro evento', 'La mesa no es de este evento.',
    t_try($q$select rpc_assign_table('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000009')$q$));
  select t_check('invitado ajeno', 'Sin acceso a este invitado.',
    t_try($q$select rpc_assign_table('cccccccc-0000-0000-0000-000000000009', 'bbbbbbbb-0000-0000-0000-000000000009')$q$));
  select t_check('quitar mesa', 'ok',
    t_try($q$select rpc_assign_table('cccccccc-0000-0000-0000-000000000001', null)$q$));
  select t_check('table_no limpio', 'null',
    coalesce((select table_no from guests where id = 'cccccccc-0000-0000-0000-000000000001'), 'null'));
  update guests set display_name = 'x' where id = 'cccccccc-0000-0000-0000-000000000001';
  select t_check('editar invitado publicado sigue bloqueado', 'Familia Lopez',
    (select display_name from guests where id = 'cccccccc-0000-0000-0000-000000000001'));
rollback;

\echo ''
\echo '--- vistas: cada quien ve solo lo suyo ---'
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  select t_check('novios mesas', '2', t_count('select count(*) from event_tables'));
  select t_check('novios table_stats', '2', t_count('select count(*) from table_stats'));
  select t_check('novios event_stats', '1', t_count('select count(*) from event_stats'));
rollback;
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  select t_check('ajeno mesas', '0', t_count('select count(*) from event_tables'));
  select t_check('ajeno table_stats', '0', t_count('select count(*) from table_stats'));
  select t_check('ajeno event_stats', '0', t_count('select count(*) from event_stats'));
rollback;
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  select t_check('admin table_stats', '3', t_count('select count(*) from table_stats'));
  select t_check('admin event_stats = eventos', (select count(*)::text from events), t_count('select count(*) from event_stats'));
rollback;
begin;
  set local role anon;
  select t_check('anon table_stats', 'sin-permiso', t_count('select count(*) from table_stats'));
  select t_check('anon event_stats', 'sin-permiso', t_count('select count(*) from event_stats'));
rollback;

\echo ''
\echo '--- totales por mesa ---'
update guests set table_id = 'bbbbbbbb-0000-0000-0000-000000000001', table_no = 'Mesa 1'
 where event_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select t_check('pases mesa 1', '6', (select passes::text from table_stats where table_id = 'bbbbbbbb-0000-0000-0000-000000000001'));
select t_check('confirmados mesa 1', '3', (select confirmed_people::text from table_stats where table_id = 'bbbbbbbb-0000-0000-0000-000000000001'));
select t_check('mesa vacia', '0', (select guests::text from table_stats where table_id = 'bbbbbbbb-0000-0000-0000-000000000002'));
delete from event_tables where id = 'bbbbbbbb-0000-0000-0000-000000000001';
select t_check('borrar mesa suelta invitados', '0', (select count(*)::text from guests where table_id is not null and event_id = 'aaaaaaaa-0000-0000-0000-000000000001'));
