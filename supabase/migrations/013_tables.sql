-- =============================================================================
-- 013_tables.sql — Mesas
--
-- Las mesas se acomodan cuando ya hay confirmaciones, o sea DESPUÉS de
-- publicar. Por eso los novios y el planner pueden manejarlas en cualquier
-- estado del evento, a diferencia de la lista de invitados.
-- =============================================================================

create table event_tables (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  capacity   int check (capacity between 1 and 100),
  sort_order int not null default 0,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, name)
);

create index event_tables_event_idx on event_tables (event_id, sort_order, name);
create trigger event_tables_touch before update on event_tables for each row execute function touch_updated_at();

alter table guests add column if not exists table_id uuid references event_tables on delete set null;
create index if not exists guests_table_idx on guests (table_id);

alter table event_tables enable row level security;
revoke all on event_tables from anon;
grant select, insert, update, delete on event_tables to authenticated;

create policy event_tables_select on event_tables
  for select to authenticated using (can_see_event(event_id));

create policy event_tables_write on event_tables
  for all to authenticated
  using (can_see_event(event_id))
  with check (can_see_event(event_id));

-- Asignar mesa: la única edición de invitados que los novios pueden hacer
-- después de publicar. Por eso va por función y no por la política de guests.
create or replace function rpc_assign_table(p_guest_id uuid, p_table_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_event uuid;
  v_name  text;
begin
  select event_id into v_event from guests where id = p_guest_id;
  if v_event is null or not can_see_event(v_event) then
    raise exception 'Sin acceso a este invitado.';
  end if;

  if p_table_id is not null then
    select name into v_name from event_tables where id = p_table_id and event_id = v_event;
    if v_name is null then
      raise exception 'La mesa no es de este evento.';
    end if;
  end if;

  update guests set table_id = p_table_id, table_no = v_name where id = p_guest_id;
end;
$$;

revoke execute on function rpc_assign_table(uuid, uuid) from public;
grant  execute on function rpc_assign_table(uuid, uuid) to authenticated;

-- Invitados que ya traían mesa en texto (import viejo): se crean sus mesas.
insert into event_tables (event_id, name, sort_order)
select distinct g.event_id, trim(g.table_no), 0
from guests g
where g.table_no is not null and trim(g.table_no) <> ''
on conflict (event_id, name) do nothing;

update guests g
   set table_id = t.id
  from event_tables t
 where g.table_id is null
   and g.table_no is not null
   and t.event_id = g.event_id
   and t.name = trim(g.table_no);

-- Resumen por mesa para las vistas y la exportación.
-- security_invoker: sin esto una vista corre con los permisos de su dueño
-- (postgres, que se salta RLS) y cualquier usuario con cuenta vería los
-- totales de TODOS los eventos.
create or replace view table_stats with (security_invoker = true) as
select
  t.id as table_id,
  t.event_id,
  t.name,
  t.capacity,
  t.sort_order,
  count(g.id)::int                                   as guests,
  coalesce(sum(g.passes), 0)::int                    as passes,
  coalesce(sum(g.confirmed_count), 0)::int           as confirmed_people
from event_tables t
left join guests g on g.table_id = t.id
group by t.id;

grant select on table_stats to authenticated;

-- Mismo arreglo para la vista de 009, que se creó sin security_invoker.
alter view event_stats set (security_invoker = true);
