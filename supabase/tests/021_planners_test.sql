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
  ('22222222-2222-2222-2222-222222222222', 'staff@test.mx'),
  ('77777777-7777-7777-7777-777777777777', 'planner@test.mx'),
  ('44444444-4444-4444-4444-444444444444', 'ajeno@test.mx');
update profiles set role = 'admin' where user_id = '11111111-1111-1111-1111-111111111111';
update profiles set role = 'staff' where user_id = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '--- alta y candados ---'
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  select t_check('staff no da de alta', 'new row violates row-level security policy for table "planners"',
    t_try($q$insert into planners (email, name, code) values ('x@test.mx', 'X', 'XXXX1')$q$));
  select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  select t_check('admin sí', 'ok', t_try($q$insert into planners (email, name, code, commission_pct) values ('Planner@Test.mx', 'Pau Planner', 'PAU10', 12.5)$q$));
  select t_check('queda ligada a su cuenta', '77777777-7777-7777-7777-777777777777', (select user_id::text from planners where code = 'PAU10'));
  select t_check('código en mayúsculas obligado', 'new row for relation "planners" violates check constraint "planners_code_check"',
    t_try($q$insert into planners (email, name, code) values ('y@test.mx', 'Y', 'mal-codigo')$q$));
  reset role; -- los pedidos los escribe el servidor (service role), no un usuario
  insert into orders (planner_id, commission_amount, country, currency, package_code, package_name, package_price, total, payment_method, contact, status)
  values ((select id from planners where code = 'PAU10'), 350, 'MX', 'MXN', 'esencial', 'Esencial', 2800, 2800, 'transfer', '{"partner_a":"Ana","email":"ana@test.mx","phone":"+525512345678"}', 'pagado');
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  select t_check('marcar comisión pagada', 'ok', t_try($q$select rpc_mark_commission_paid((select id from orders where planner_id is not null limit 1))$q$));
  select t_check('pagada', '1', (select count(*)::text from orders where commission_paid_at is not null));

  select set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777777', true);
  select t_check('planner ve su ficha', '1', (select count(*)::text from planners));
  select t_check('planner ve su pedido', '1', (select count(*)::text from orders where planner_id is not null));
  update planners set commission_pct = 50 where code = 'PAU10';
  select t_check('planner no cambia su comisión', '12.50', (select commission_pct::text from planners where code = 'PAU10'));
  select t_check('planner no marca pagos', 'Solo el admin marca comisiones.', t_try($q$select rpc_mark_commission_paid((select id from orders limit 1))$q$));

  select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
  select t_check('ajeno no ve planners', '0', (select count(*)::text from planners));
  select t_check('ajeno no ve pedidos', '0', (select count(*)::text from orders));
rollback;
