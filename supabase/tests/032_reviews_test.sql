\set ON_ERROR_STOP on
\pset pager off
\set QUIET on

-- Requiere 001..032 sobre el shim. Reseñas.

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
  ('33333333-3333-3333-3333-333333333333', 'novios@test.mx'),
  ('44444444-4444-4444-4444-444444444444', 'ajeno@test.mx');
update profiles set role = 'staff' where user_id = '22222222-2222-2222-2222-222222222222';
insert into events (id, slug, status, content) values ('aaaaaaaa-0000-0000-0000-000000000001', 'resena', 'publicado', '{"version":1}'::jsonb);
insert into event_members (event_id, user_id) values ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333');

\echo ''
\echo '--- reseñas ---'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
  insert into reviews (event_id, user_id, author_name, rating, body) values ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 'Ana', 5, 'Quedó preciosa y todos confirmaron rapidísimo.');
  select t_check('novios dejan su reseña', '1', (select count(*)::text from reviews));
  select t_check('solo una por evento', 'false', (select (t_try($q$insert into reviews (event_id, user_id, author_name, rating, body) values ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 'Ana', 4, 'Otra reseña más del mismo evento.')$q$) = 'ok')::text));
  select t_check('novios no la aprueban', '0', (select count(*)::text from reviews where (select (t_try($q$update reviews set approved_at = now()$q$) = 'ok')) and approved_at is not null));
  set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
  select t_check('ajeno no ve', '0', (select count(*)::text from reviews));
  select t_check('ajeno no inserta', 'false', (select (t_try($q$insert into reviews (event_id, user_id, author_name, rating, body) values ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 'X', 5, 'Intento de reseña ajena aquí.')$q$) = 'ok')::text));
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  update reviews set approved_at = now();
  select t_check('equipo aprueba', '1', (select count(*)::text from reviews where approved_at is not null));
  set local role anon;
  select t_check('anon no lee', 'false', (select (t_try($q$select count(*) from reviews$q$) = 'ok')::text));
rollback;
