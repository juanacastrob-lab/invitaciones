-- =============================================================================
-- 022_event_reminders.sql — Recordatorio del evento (24–48 h antes)
--
-- Distinto del recordatorio de "confirma": este va a los que sí vienen (y a
-- los que no han dicho que no), horas antes del evento, con hora y lugar.
-- Sale por WhatsApp Cloud API si está configurada; si no, por correo.
-- =============================================================================

alter table events add column if not exists event_reminder_hours int[] not null default '{}';
alter table guests add column if not exists event_reminder_milestone int;

insert into message_templates (key, language, body) values
  ('event_soon', 'es',
   E'Hola {nombre} 👋\n\nYa casi: {pareja} te esperan el {fecha} a las {hora} en {lugar}.\n\nTodos los detalles y cómo llegar:\n{link}\n\n¡Nos vemos ahí!'),
  ('event_soon', 'en',
   E'Hi {nombre} 👋\n\nAlmost there: {pareja} are expecting you on {fecha} at {hora} at {lugar}.\n\nAll the details and directions:\n{link}\n\nSee you there!')
on conflict (key, language) do nothing;
