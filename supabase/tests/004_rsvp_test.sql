\set ON_ERROR_STOP on
\pset pager off
\set QUIET on

create or replace function t_check(nombre text, esperado text, obtenido text)
returns void language plpgsql as $$
begin
  if esperado is not distinct from obtenido then
    raise notice '  OK   %', nombre;
  else
    raise notice '  FALLA % -> esperaba [%], obtuvo [%]', nombre, esperado, obtenido;
  end if;
end;
$$;

-- token de un invitado con 2 pases, y otro con 5
create or replace function tk(nombre text) returns text
language sql stable as $$ select token from guests where display_name = nombre $$;

\echo ''
\echo '--- confirmar dentro de sus pases ---'
select t_check('acepta 2 de 2 pases', 'true',
  rpc_submit_rsvp('ana-y-luis', tk('Mariana Ruiz'),
    '{"attending":true,"count":2,"attendee_names":["Mariana Ruiz","Pablo Sánchez"],
      "menu_choices":{"Mariana Ruiz":"pollo","Pablo Sánchez":"vegetariano"},
      "song":"Como la flor","message":"Ahí estaremos","locale":"es"}'::jsonb) ->> 'ok');
select t_check('marca al invitado como confirmado', 'confirmed',
  (select status::text from guests where display_name = 'Mariana Ruiz'));
select t_check('guarda cuantas personas', '2',
  (select confirmed_count::text from guests where display_name = 'Mariana Ruiz'));

\echo ''
\echo '--- no se puede confirmar mas gente que pases ---'
select t_check('rechaza 3 en 2 pases', 'too_many_passes',
  rpc_submit_rsvp('ana-y-luis', tk('Roberto y Carmen Díaz'),
    '{"attending":true,"count":3}'::jsonb) ->> 'error');
select t_check('dice cuantos pases si tiene', '2',
  rpc_submit_rsvp('ana-y-luis', tk('Roberto y Carmen Díaz'),
    '{"attending":true,"count":3}'::jsonb) ->> 'passes');
select t_check('sigue pendiente', 'pending',
  (select status::text from guests where display_name = 'Roberto y Carmen Díaz'));

\echo ''
\echo '--- no asisto ---'
select t_check('acepta el no', 'true',
  rpc_submit_rsvp('ana-y-luis', tk('Jorge Hernández'),
    '{"attending":false,"count":3,"message":"No voy a poder, felicidades"}'::jsonb) ->> 'ok');
select t_check('lo marca como no asiste', 'declined',
  (select status::text from guests where display_name = 'Jorge Hernández'));
select t_check('ignora el count que mando', '0',
  (select confirmed_count::text from guests where display_name = 'Jorge Hernández'));
select t_check('pero guarda su mensaje', 'No voy a poder, felicidades',
  (select message from rsvp_responses r join guests g on g.id = r.guest_id
    where g.display_name = 'Jorge Hernández' order by r.created_at desc limit 1));

\echo ''
\echo '--- cambiar de opinion ---'
do $$
declare r jsonb;
begin
  r := rpc_submit_rsvp('ana-y-luis', tk('Sarah Whitfield'), '{"attending":true,"count":2}'::jsonb);
  r := rpc_submit_rsvp('ana-y-luis', tk('Sarah Whitfield'), '{"attending":false}'::jsonb);
  if (select status from guests where display_name = 'Sarah Whitfield') = 'declined'
     and (select count(*) from rsvp_responses r2 join guests g on g.id = r2.guest_id
          where g.display_name = 'Sarah Whitfield') = 2
  then raise notice '  OK   manda la ultima respuesta y guarda el historial completo';
  else raise notice '  FALLA no respeto la ultima respuesta o perdio el historial';
  end if;
end;
$$;

\echo ''
\echo '--- menu ---'
select t_check('rechaza un platillo que no existe', 'menu_invalid',
  rpc_submit_rsvp('ana-y-luis', tk('The Miller Family'),
    '{"attending":true,"count":2,"menu_choices":{"a":"langosta"}}'::jsonb) ->> 'error');
select t_check('acepta los del evento', 'true',
  rpc_submit_rsvp('ana-y-luis', tk('The Miller Family'),
    '{"attending":true,"count":2,"menu_choices":{"a":"carne","b":"pollo"}}'::jsonb) ->> 'ok');

\echo ''
\echo '--- datos que no cuadran ---'
select t_check('sin decir si asiste o no', 'invalid_payload',
  rpc_submit_rsvp('ana-y-luis', tk('Daniel Okonkwo'), '{"count":1}'::jsonb) ->> 'error');
select t_check('asiste pero cero personas', 'invalid_count',
  rpc_submit_rsvp('ana-y-luis', tk('Daniel Okonkwo'), '{"attending":true,"count":0}'::jsonb) ->> 'error');
select t_check('mas nombres que personas', 'too_many_names',
  rpc_submit_rsvp('ana-y-luis', tk('Daniel Okonkwo'),
    '{"attending":true,"count":1,"attendee_names":["Uno","Dos","Tres"]}'::jsonb) ->> 'error');

\echo ''
\echo '--- token que no sirve ---'
select t_check('token inventado', 'invalid_token',
  rpc_submit_rsvp('ana-y-luis', 'noExisteEsteToken', '{"attending":true,"count":1}'::jsonb) ->> 'error');
select t_check('token de otro evento', 'invalid_token',
  rpc_submit_rsvp('ana-y-luis', 'TOKEN-DE-OTRO-EVENTO', '{"attending":true,"count":1}'::jsonb) ->> 'error');
select t_check('evento que no existe', 'not_found',
  rpc_submit_rsvp('no-existe', tk('Familia Contreras'), '{"attending":true,"count":1}'::jsonb) ->> 'error');

\echo ''
\echo '--- fecha limite ---'
begin;
  update events set rsvp_deadline = now() - interval '1 day' where slug = 'ana-y-luis';
  select t_check('cerrado despues de la fecha limite', 'closed',
    rpc_submit_rsvp('ana-y-luis', tk('Familia Contreras'), '{"attending":true,"count":1}'::jsonb) ->> 'error');
rollback;

\echo ''
\echo '--- texto larguisimo: se recorta, no se rechaza ---'
do $$
declare r jsonb; largo text;
begin
  largo := repeat('a', 3000);
  r := rpc_submit_rsvp('ana-y-luis', tk('Familia Contreras'),
        jsonb_build_object('attending', true, 'count', 1, 'message', largo));
  if r ->> 'ok' = 'true'
     and (select length(message) from rsvp_responses r2 join guests g on g.id = r2.guest_id
          where g.display_name = 'Familia Contreras' order by r2.created_at desc limit 1) = 1000
  then raise notice '  OK   recorta a 1000 y guarda la confirmacion';
  else raise notice '  FALLA %', r::text;
  end if;
end;
$$;

\echo ''
\echo '--- rate limit del RSVP ---'
do $$
declare aceptados int := 0; i int; r jsonb;
begin
  for i in 1..14 loop
    r := rpc_submit_rsvp('ana-y-luis', tk('Familia López Ramírez'),
          '{"attending":true,"count":1}'::jsonb);
    if r ->> 'ok' = 'true' then aceptados := aceptados + 1; end if;
  end loop;
  if aceptados = 10 then raise notice '  OK   corta a los 10 intentos por hora';
  else raise notice '  FALLA dejo pasar % (esperaba 10)', aceptados;
  end if;
end;
$$;

\echo ''
\echo '--- la confirmacion se ve en el link personal ---'
select t_check('devuelve su ultima respuesta', 'true',
  rpc_get_invitation('ana-y-luis', tk('Mariana Ruiz')) -> 'guest' -> 'response' ->> 'attending');
select t_check('con su cancion', 'Como la flor',
  rpc_get_invitation('ana-y-luis', tk('Mariana Ruiz')) -> 'guest' -> 'response' ->> 'song');
