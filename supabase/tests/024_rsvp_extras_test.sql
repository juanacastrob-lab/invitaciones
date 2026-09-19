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

insert into events (slug, status, content) values ('rsvp-extra', 'publicado',
  '{"version":1,"couple":{"partnerA":"Ana","partnerB":"Luis"},"startsAt":"2027-06-12T17:00","sectionOrder":["cover","rsvp"],"rsvp":{"askChildren":true,"questions":[{"id":"q_bus","label":{"es":"¿Usas el transporte?"},"type":"yesno"}]}}'::jsonb);
insert into guests (event_id, display_name, passes, token) values ((select id from events where slug = 'rsvp-extra'), 'Familia Test', 4, 'tok_extra_1234567890');

\echo ''
\echo '--- respuestas extra ---'
begin;
  set local role service_role;
  select t_check('sin RSVP previo', 'not_found', (select rpc_submit_rsvp_extra('rsvp-extra', 'tok_extra_1234567890', '{"q_bus":"sí"}') ->> 'error'));
  select rpc_submit_rsvp('rsvp-extra', 'tok_extra_1234567890', '{"attending":true,"count":3,"attendee_names":["Ana","Luis","Pau"],"locale":"es"}', null);
  select t_check('guarda respuesta válida', 'true', (select rpc_submit_rsvp_extra('rsvp-extra', 'tok_extra_1234567890', '{"q_bus":" sí ","q_hack":"x"}', 2) ->> 'ok'));
  select t_check('solo preguntas del evento, recortadas', '{"q_bus": "sí"}', (select answers::text from rsvp_responses order by created_at desc limit 1));
  select t_check('niños tope en asistentes', '2', (select children_count::text from rsvp_responses order by created_at desc limit 1));
  select rpc_submit_rsvp_extra('rsvp-extra', 'tok_extra_1234567890', '{}', 9);
  select t_check('niños nunca más que asistentes', '3', (select children_count::text from rsvp_responses order by created_at desc limit 1));
  select t_check('token ajeno', 'invalid_token', (select rpc_submit_rsvp_extra('rsvp-extra', 'tok_no_existe_12345', '{}') ->> 'error'));
  select t_check('la invitación trae las respuestas', '3', (select rpc_get_invitation('rsvp-extra', 'tok_extra_1234567890') -> 'guest' -> 'response' ->> 'children_count'));
rollback;
