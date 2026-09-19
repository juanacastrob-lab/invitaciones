\set ON_ERROR_STOP on
\pset pager off
\set QUIET on

-- Requiere 001..029 sobre el shim. Borradores de la tienda.

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
  ('22222222-2222-2222-2222-222222222222', 'staff@test.mx'),
  ('33333333-3333-3333-3333-333333333333', 'novios@test.mx');
update profiles set role = 'staff' where user_id = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '--- borradores ---'
begin;
  set local role service_role;
  insert into design_drafts (key, package_code, content) values ('abcdefghijklmnopqrstuvwxyz123456', 'express', '{"partnerA":"Ana"}');
  select t_check('clave corta no entra', 'false', (select (t_try($q$insert into design_drafts (key, package_code) values ('corta', 'express')$q$) = 'ok')::text));
  select t_check('caduca en ~48 h', 'true', (select (expires_at between now() + interval '47 hours' and now() + interval '49 hours')::text from design_drafts where key = 'abcdefghijklmnopqrstuvwxyz123456'));

  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  select t_check('equipo ve borradores', '1', (select count(*)::text from design_drafts));
  select t_check('equipo no los edita', 'false', (select (t_try($q$update design_drafts set step = 3$q$) = 'ok')::text));
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
  select t_check('novios no ven borradores', '0', (select count(*)::text from design_drafts));
  set local role anon;
  select t_check('anon no lee', 'false', (select (t_try($q$select count(*) from design_drafts$q$) = 'ok')::text));

  reset role;
  insert into orders (id, event_type, country, currency, package_code, package_name, package_price, total, payment_method, status, contact, draft_key)
    values ('eeeeeeee-0000-0000-0000-000000000001', 'boda', 'MX', 'MXN', 'express', 'Express', 899, 899, 'card_sim', 'pagado', '{"partner_a":"Ana","email":"a@b.mx","phone":"+52"}', 'abcdefghijklmnopqrstuvwxyz123456');
  update design_drafts set order_id = 'eeeeeeee-0000-0000-0000-000000000001' where key = 'abcdefghijklmnopqrstuvwxyz123456';
  select t_check('pagado ya no caduca', 'true', (select (expires_at > now() + interval '1 year')::text from design_drafts where key = 'abcdefghijklmnopqrstuvwxyz123456'));
rollback;
