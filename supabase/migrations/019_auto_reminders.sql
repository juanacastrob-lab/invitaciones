-- =============================================================================
-- 019_auto_reminders.sql — Recordatorios automáticos por correo
--
-- Por evento: encendido y "días antes" de la fecha límite (o de la fecha del
-- evento si no hay límite). Un proceso programado en Netlify manda el correo
-- a los pendientes con correo; en cada invitado queda el último hito enviado
-- para no repetir. Nada de esto abre permisos nuevos: lo corre el servidor.
-- =============================================================================

alter table events add column if not exists auto_reminders boolean not null default false;
alter table events add column if not exists reminder_days int[] not null default '{7,3}';
alter table guests add column if not exists auto_reminder_milestone int;

create index if not exists guests_auto_reminder_idx on guests (event_id, status) where status = 'pending' and email is not null;
