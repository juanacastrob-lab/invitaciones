-- =============================================================================
-- 009_admin.sql — Lo que necesita el panel del equipo
-- =============================================================================

-- País del evento: para validar teléfonos de invitados (+52 / +1) y para el
-- paquete. Los eventos que ya existen quedan en México.
alter table events add column if not exists country text not null default 'MX'
  check (country in ('MX', 'US', 'CA'));

-- Bitácora: quién hizo qué. La tabla no acepta inserts directos (ver 001);
-- solo se escribe por aquí, con el usuario de la sesión como actor.
create or replace function log_activity(
  p_entity    text,
  p_entity_id uuid,
  p_action    text,
  p_data      jsonb default '{}'
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'log_activity requiere sesión';
  end if;
  insert into activity_log (actor, entity, entity_id, action, data)
  values (auth.uid(), p_entity, p_entity_id, p_action, coalesce(p_data, '{}'::jsonb));
end;
$$;

revoke execute on function log_activity(text, uuid, text, jsonb) from public;
grant  execute on function log_activity(text, uuid, text, jsonb) to authenticated;

-- Resumen por evento para la lista del admin y el panel de novios, en una
-- sola consulta en vez de N. Respeta RLS porque es una vista normal.
create or replace view event_stats as
select
  e.id as event_id,
  count(g.id)::int                                                  as guests,
  coalesce(sum(g.passes), 0)::int                                   as passes,
  coalesce(sum(g.confirmed_count), 0)::int                          as confirmed_people,
  count(g.id) filter (where g.status = 'confirmed')::int            as confirmed,
  count(g.id) filter (where g.status = 'declined')::int             as declined,
  count(g.id) filter (where g.status = 'pending')::int              as pending,
  count(g.id) filter (where g.status = 'pending' and g.opened_at is not null)::int as opened_pending,
  count(g.id) filter (where g.sent_at is not null)::int             as sent
from events e
left join guests g on g.event_id = e.id
group by e.id;

grant select on event_stats to authenticated;
