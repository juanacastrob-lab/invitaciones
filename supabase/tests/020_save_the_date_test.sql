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

insert into events (slug, status, save_the_date_enabled, content)
values ('std-borrador', 'borrador', true, '{"version":1,"couple":{"partnerA":"Ana","partnerB":"Luis"},"startsAt":"2027-06-12T17:00","saveTheDate":{"note":{"es":"Aparta la fecha"}},"gifts":{"bank":{"bank":"X","holder":"Y"}}}'::jsonb),
       ('std-apagado', 'publicado', false, '{"version":1}'::jsonb);

\echo ''
\echo '--- save the date ---'
begin;
  set local role service_role;
  select t_check('borrador con save the date activo sale', 'Ana', (select rpc_get_save_the_date('std-borrador') -> 'couple' ->> 'partnerA'));
  select t_check('trae la nota', 'Aparta la fecha', (select rpc_get_save_the_date('std-borrador') -> 'note' ->> 'es'));
  select t_check('no filtra regalos ni nada mas', 'null', coalesce((select rpc_get_save_the_date('std-borrador') ->> 'gifts'), 'null'));
  select t_check('apagado = nada', 'null', coalesce((select rpc_get_save_the_date('std-apagado')::text), 'null'));
  select t_check('inexistente = nada', 'null', coalesce((select rpc_get_save_the_date('no-existe')::text), 'null'));
  select t_check('la invitacion normal sigue oculta en borrador', 'null', coalesce((select rpc_get_invitation('std-borrador')::text), 'null'));
rollback;
create or replace function t_try(q text)
returns text language plpgsql as $$
begin execute q; return 'ok';
exception when others then return sqlerrm; end;
$$;
begin;
  set local role anon;
  select t_check('anon no puede llamarla', 'permission denied for function rpc_get_save_the_date', t_try($q$select rpc_get_save_the_date('std-borrador')$q$));
rollback;
select t_check('plantillas nuevas', '4', (select count(*)::text from message_templates where key in ('save_the_date', 'thank_you')));
