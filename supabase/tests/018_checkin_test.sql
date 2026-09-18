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
insert into events (id, slug, status, checkin_enabled, created_by) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'boda-qr', 'publicado', true, '11111111-1111-1111-1111-111111111111');
insert into event_members (event_id, user_id) values ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333');
insert into guests (id, event_id, display_name, passes, token, status, confirmed_count) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Familia Lopez', 4, 'tok_lopez_1234567890', 'confirmed', 3);

\echo ''
\echo '--- check-in ---'
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  select t_check('ajeno', 'Sin acceso a este evento.', t_try($q$select rpc_checkin('aaaaaaaa-0000-0000-0000-000000000001', 3, 'tok_lopez_1234567890')$q$));
  select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  select t_check('token malo', 'not_found', (select (rpc_checkin('aaaaaaaa-0000-0000-0000-000000000001', 3, 'nada'))->>'error'));
  select t_check('llegan 3', 'false', (select (rpc_checkin('aaaaaaaa-0000-0000-0000-000000000001', 3, 'tok_lopez_1234567890'))->>'already'));
  select t_check('guardado', '3', (select checked_in_count::text from guests where id = 'cccccccc-0000-0000-0000-000000000001'));
  select t_check('segunda vez avisa', 'true', (select (rpc_checkin('aaaaaaaa-0000-0000-0000-000000000001', 4, 'tok_lopez_1234567890'))->>'already'));
  select t_check('tope en pases', '4', (select (rpc_checkin('aaaaaaaa-0000-0000-0000-000000000001', 99, null, 'cccccccc-0000-0000-0000-000000000001'))->'guest'->>'checked_in_count'));
  select rpc_checkin('aaaaaaaa-0000-0000-0000-000000000001', 0, 'tok_lopez_1234567890');
  select t_check('deshacer', 'null', coalesce((select checked_in_at::text from guests where id = 'cccccccc-0000-0000-0000-000000000001'), 'null'));
  select t_check('automático = confirmados', '3', (select (rpc_checkin('aaaaaaaa-0000-0000-0000-000000000001', null, 'tok_lopez_1234567890'))->'guest'->>'checked_in_count'));
  select rpc_checkin('aaaaaaaa-0000-0000-0000-000000000001', 2, 'tok_lopez_1234567890');
  select t_check('automático respeta lo ya marcado', '2', (select (rpc_checkin('aaaaaaaa-0000-0000-0000-000000000001', null, 'tok_lopez_1234567890'))->'guest'->>'checked_in_count'));
rollback;

\echo ''
\echo '--- la invitación trae la bandera y el invitado su llegada ---'
begin;
  set local role service_role;
  select t_check('checkin_enabled', 'true', (select (rpc_get_invitation('boda-qr', 'tok_lopez_1234567890'))->'event'->>'checkin_enabled'));
  select t_check('checked_in_at null', 'null', coalesce((select (rpc_get_invitation('boda-qr', 'tok_lopez_1234567890'))->'guest'->>'checked_in_at'), 'null'));
rollback;

select t_check('event_stats con llegadas', '0', (select checked_in_people::text from event_stats where event_id = 'aaaaaaaa-0000-0000-0000-000000000001'));
