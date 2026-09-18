\set ON_ERROR_STOP on
\pset pager off
\set QUIET on

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

-- cuenta filas visibles; si ni permiso hay, devuelve 'sin-permiso'
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

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin@test.mx'),
  ('22222222-2222-2222-2222-222222222222', 'staff@test.mx'),
  ('33333333-3333-3333-3333-333333333333', 'novios@test.mx'),
  ('44444444-4444-4444-4444-444444444444', 'ajeno@test.mx');

update profiles set role = 'admin' where user_id = '11111111-1111-1111-1111-111111111111';
update profiles set role = 'staff' where user_id = '22222222-2222-2222-2222-222222222222';

insert into events (id, slug, status, created_by) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana-y-luis', 'publicado', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'otra-boda',  'borrador',  '11111111-1111-1111-1111-111111111111');

insert into event_members (event_id, user_id)
values ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333');

insert into guests (event_id, display_name, passes) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Familia Lopez', 4),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Mariana Ruiz',  2),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Invitado ajeno', 1);

\echo ''
\echo '--- invitado sin cuenta (anon): no debe ver nada ---'
begin;
  set local role anon;
  select t_check('events',   'sin-permiso', t_count('select count(*) from events'));
  select t_check('guests',   'sin-permiso', t_count('select count(*) from guests'));
  select t_check('profiles', 'sin-permiso', t_count('select count(*) from profiles'));
  select t_check('rsvp',     'sin-permiso', t_count('select count(*) from rsvp_responses'));
commit;

\echo ''
\echo '--- novios: solo SU evento (1) y SUS invitados (2) ---'
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  select t_check('events', '1', t_count('select count(*) from events'));
  select t_check('guests', '2', t_count('select count(*) from guests'));
commit;

\echo ''
\echo '--- usuario ajeno: cero ---'
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  select t_check('events', '0', t_count('select count(*) from events'));
  select t_check('guests', '0', t_count('select count(*) from guests'));
commit;

\echo ''
\echo '--- staff: ve los 2 eventos y los 3 invitados ---'
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  select t_check('events', '2', t_count('select count(*) from events'));
  select t_check('guests', '3', t_count('select count(*) from guests'));
commit;

\echo ''
\echo '--- borrar eventos: staff no, admin si ---'
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  select t_check('staff borra', '0',
    t_count('with d as (delete from events where slug = ''otra-boda'' returning 1) select count(*) from d'));
rollback;
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  select t_check('admin borra', '1',
    t_count('with d as (delete from events where slug = ''otra-boda'' returning 1) select count(*) from d'));
rollback;

\echo ''
\echo '--- escalacion de privilegios: un cliente no puede hacerse admin ---'
do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  update profiles set role = 'admin' where user_id = '33333333-3333-3333-3333-333333333333';
  raise notice '  FALLA se pudo autoascender a admin';
exception when others then
  raise notice '  OK   bloqueado: %', sqlerrm;
end;
$$;

\echo ''
\echo '--- reglas de negocio ---'
do $$
begin
  insert into guests (event_id, display_name, passes, confirmed_count)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'Tramposo', 2, 5);
  raise notice '  FALLA confirmo mas personas que pases';
exception when check_violation then
  raise notice '  OK   no se puede confirmar mas que los pases';
end;
$$;

do $$
begin
  insert into rsvp_responses (guest_id, attending, count)
  values ((select id from guests limit 1), false, 3);
  raise notice '  FALLA "no asisto" con 3 personas';
exception when check_violation then
  raise notice '  OK   "no asisto" obliga a 0 personas';
end;
$$;

do $$
begin
  insert into events (slug) values ('Boda Con Mayusculas Y Espacios');
  raise notice '  FALLA slug invalido aceptado';
exception when check_violation then
  raise notice '  OK   slug invalido rechazado';
end;
$$;

do $$
begin
  insert into events (slug, languages, default_language) values ('prueba-idioma', '{es}', 'en');
  raise notice '  FALLA idioma por defecto fuera de la lista';
exception when check_violation then
  raise notice '  OK   el idioma por defecto debe estar en la lista';
end;
$$;
