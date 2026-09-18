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
create or replace function t_try(q text)
returns text language plpgsql as $$
begin execute q; return 'ok';
exception when others then return sqlerrm; end;
$$;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin@test.mx'),
  ('33333333-3333-3333-3333-333333333333', 'novios@test.mx'),
  ('44444444-4444-4444-4444-444444444444', 'ajeno@test.mx');
update profiles set role = 'admin' where user_id = '11111111-1111-1111-1111-111111111111';
insert into events (id, slug, status, created_by) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'rev', 'en_revision', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'bor', 'borrador',    '11111111-1111-1111-1111-111111111111');
insert into event_members (event_id, user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333');

\echo ''
\echo '--- aprobar ---'
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  select t_check('ajeno', 'Sin acceso a este evento.', t_try($q$select rpc_approve_event('aaaaaaaa-0000-0000-0000-000000000001')$q$));
  select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  select t_check('borrador no se aprueba', 'La invitación no está en revisión.', t_try($q$select rpc_approve_event('aaaaaaaa-0000-0000-0000-000000000002')$q$));
  select t_check('en revisión sí', 'ok', t_try($q$select rpc_approve_event('aaaaaaaa-0000-0000-0000-000000000001')$q$));
  select t_check('queda publicado', 'publicado', (select status::text from events where id = 'aaaaaaaa-0000-0000-0000-000000000001'));
  select t_check('dos veces no', 'La invitación no está en revisión.', t_try($q$select rpc_approve_event('aaaaaaaa-0000-0000-0000-000000000001')$q$));
  reset role;
  select t_check('bitácora', 'client', (select data->>'by' from activity_log where action = 'approved' and entity_id = 'aaaaaaaa-0000-0000-0000-000000000001'));
rollback;
