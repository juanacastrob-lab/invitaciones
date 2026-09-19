\set ON_ERROR_STOP on
\pset pager off
\set QUIET on

-- Requiere 001..028 sobre el shim. CRM y bandeja de WhatsApp.

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
\echo '--- CRM ---'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  insert into leads (id, partner_a, phone, country, consent_at, source) values ('cccccccc-0000-0000-0000-000000000001', 'Sofía', '+5215512345678', 'MX', now(), 'whatsapp');
  select t_check('staff da de alta sin correo ni pareja', '1', (select count(*)::text from leads where id = 'cccccccc-0000-0000-0000-000000000001'));
  update leads set stage = 'contactado' where id = 'cccccccc-0000-0000-0000-000000000001';
  select t_check('cambio de etapa deja actividad', 'nuevo → contactado', (select body from lead_activities where lead_id = 'cccccccc-0000-0000-0000-000000000001' and kind = 'etapa'));
  select t_check('contactado marca último contacto', 'true', (select (last_contact_at is not null)::text from leads where id = 'cccccccc-0000-0000-0000-000000000001'));
  insert into lead_activities (lead_id, actor, kind, body, due_at) values ('cccccccc-0000-0000-0000-000000000001', auth.uid(), 'tarea', 'Mandar cotización', now() + interval '1 day');
  select t_check('tarea pendiente', '1', (select count(*)::text from lead_activities where lead_id = 'cccccccc-0000-0000-0000-000000000001' and kind = 'tarea' and done_at is null));

  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
  select t_check('novios no ven prospectos', '0', (select count(*)::text from leads));
  select t_check('novios no ven actividades', '0', (select count(*)::text from lead_activities));
  select t_check('novios no dan de alta', 'false', (select (t_try($q$insert into leads (partner_a, phone, country, consent_at) values ('X', '+52', 'MX', now())$q$) = 'ok')::text));
rollback;

\echo ''
\echo '--- bandeja de WhatsApp ---'
begin;
  set local role service_role;
  insert into wa_conversations (id, phone, name, last_inbound_at, unread) values ('dddddddd-0000-0000-0000-000000000001', '5215512345678', 'Sofía', now(), 2);
  insert into wa_messages (conversation_id, direction, wa_id, body) values ('dddddddd-0000-0000-0000-000000000001', 'in', 'wamid.1', 'Hola, quiero info');
  select t_check('webhook no duplica mensajes', 'false', (select (t_try($q$insert into wa_messages (conversation_id, direction, wa_id, body) values ('dddddddd-0000-0000-0000-000000000001', 'in', 'wamid.1', 'repetido')$q$) = 'ok')::text));

  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  select t_check('staff ve la conversación', '1', (select count(*)::text from wa_conversations));
  select t_check('staff ve el mensaje', 'Hola, quiero info', (select body from wa_messages limit 1));
  select rpc_wa_mark_read('dddddddd-0000-0000-0000-000000000001');
  select t_check('marcar leída', '0', (select unread::text from wa_conversations where id = 'dddddddd-0000-0000-0000-000000000001'));
  select t_check('staff no inserta mensajes directo', 'false', (select (t_try($q$insert into wa_messages (conversation_id, direction, body) values ('dddddddd-0000-0000-0000-000000000001', 'out', 'x')$q$) = 'ok')::text));

  set local role service_role;
  update wa_conversations set unread = 2 where id = 'dddddddd-0000-0000-0000-000000000001';
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
  select t_check('novios no ven conversaciones', '0', (select count(*)::text from wa_conversations));
  select t_check('novios no ven mensajes', '0', (select count(*)::text from wa_messages));
  select rpc_wa_mark_read('dddddddd-0000-0000-0000-000000000001');
  set local role service_role;
  select t_check('novios no marcan leída', '2', (select unread::text from wa_conversations where id = 'dddddddd-0000-0000-0000-000000000001'));
rollback;
