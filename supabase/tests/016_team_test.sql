\set ON_ERROR_STOP on
\pset pager off
\set QUIET on

-- Requiere 001..016 sobre el shim. Candados del equipo.

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
  ('22222222-2222-2222-2222-222222222222', 'staff@test.mx'),
  ('33333333-3333-3333-3333-333333333333', 'novios@test.mx');
update profiles set role = 'admin' where user_id = '11111111-1111-1111-1111-111111111111';
update profiles set role = 'staff' where user_id = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '--- admin: invita, cambia roles, con candados ---'
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  select t_check('perfil trae correo', 'novios@test.mx', (select email from profiles where user_id = '33333333-3333-3333-3333-333333333333'));
  select t_check('invitar correo nuevo', 'ok', t_try($q$select rpc_invite_staff('Nueva@Test.mx')$q$));
  select t_check('queda pendiente', 'nueva@test.mx', (select email from team_invites where accepted_at is null));
  select t_check('invitar a alguien con cuenta', 'ok', t_try($q$select rpc_invite_staff('novios@test.mx')$q$));
  select t_check('ya es staff', 'staff', (select role::text from profiles where user_id = '33333333-3333-3333-3333-333333333333'));
  select t_check('regresar a cliente', 'ok', t_try($q$select rpc_set_role('33333333-3333-3333-3333-333333333333', 'client')$q$));
  select t_check('es cliente', 'client', (select role::text from profiles where user_id = '33333333-3333-3333-3333-333333333333'));
  select t_check('nunca admin', 'Los admin solo se nombran por SQL.', t_try($q$select rpc_set_role('33333333-3333-3333-3333-333333333333', 'admin')$q$));
  select t_check('no a sí mismo', 'No puedes cambiar tu propio rol.', t_try($q$select rpc_set_role('11111111-1111-1111-1111-111111111111', 'client')$q$));
  select t_check('invitarse a sí mismo', 'Ese es tu propio correo.', t_try($q$select rpc_invite_staff('admin@test.mx')$q$));
  select t_check('correo inválido', 'Correo inválido.', t_try($q$select rpc_invite_staff('nada')$q$));
rollback;

\echo ''
\echo '--- staff: no toca equipo, precios ni borra eventos ---'
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  select t_check('staff invita', 'Solo el admin maneja el equipo.', t_try($q$select rpc_invite_staff('x@test.mx')$q$));
  select t_check('staff cambia rol', 'Solo el admin maneja el equipo.', t_try($q$select rpc_set_role('33333333-3333-3333-3333-333333333333', 'staff')$q$));
  select t_check('staff se autoasciende', 'Solo un admin puede cambiar el rol de un perfil.', t_try($q$update profiles set role = 'admin' where user_id = '22222222-2222-2222-2222-222222222222'$q$));
  update packages set price = 1 where country = 'MX';
  select t_check('staff cambia precio (RLS ignora)', '0', (select count(*)::text from packages where price = 1));
  update extras set price = 1 where country = 'MX';
  select t_check('staff cambia extra (RLS ignora)', '0', (select count(*)::text from extras where price = 1));
  select t_check('staff ve invitaciones de equipo', '0', (select count(*)::text from team_invites));
rollback;

\echo ''
\echo '--- alta por invitación: entra y ya es staff ---'
begin;
  select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  set local role authenticated;
  select rpc_invite_staff('empleada@test.mx');
  reset role;
  insert into auth.users (id, email) values ('55555555-5555-5555-5555-555555555555', 'Empleada@test.mx');
  select t_check('rol al entrar', 'staff', (select role::text from profiles where user_id = '55555555-5555-5555-5555-555555555555'));
  select t_check('invitación aceptada', '1', (select count(*)::text from team_invites where email = 'empleada@test.mx' and accepted_at is not null));
  insert into auth.users (id, email) values ('66666666-6666-6666-6666-666666666666', 'cualquiera@test.mx');
  select t_check('sin invitación = cliente', 'client', (select role::text from profiles where user_id = '66666666-6666-6666-6666-666666666666'));
rollback;
