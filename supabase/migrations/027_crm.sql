-- =============================================================================
-- 027_crm.sql — CRM: prospectos con dueño, valor, motivo de pérdida y bitácora
-- de actividades (notas, llamadas, tareas de seguimiento).
--
-- Un prospecto puede llegar sin correo ni segunda persona (por WhatsApp), así
-- que esas columnas dejan de ser obligatorias.
-- =============================================================================

alter table leads alter column partner_b drop not null;
alter table leads alter column email drop not null;
alter table leads
  add column if not exists assigned_to     uuid references auth.users on delete set null,
  add column if not exists value           numeric(10,2) check (value is null or value >= 0),
  add column if not exists currency        text not null default 'MXN' check (currency in ('MXN','USD','CAD')),
  add column if not exists lost_reason     text,
  add column if not exists last_contact_at timestamptz,
  add column if not exists order_id        uuid references orders on delete set null;

create index if not exists leads_phone_idx     on leads (phone);
create index if not exists leads_follow_up_idx on leads (next_follow_up) where stage not in ('entregado', 'perdido');

-- El equipo puede dar de alta prospectos a mano (llamada, Instagram, referido).
grant insert on leads to authenticated;
drop policy if exists leads_insert_team on leads;
create policy leads_insert_team on leads
  for insert to authenticated with check (is_team());

-- Actividades: lo que pasó con el prospecto y lo que toca hacer.
create table if not exists lead_activities (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references leads on delete cascade,
  actor      uuid references auth.users on delete set null,
  kind       text not null check (kind in ('nota','llamada','whatsapp','correo','etapa','tarea','pedido')),
  body       text,
  due_at     timestamptz,
  done_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists lead_activities_lead_idx on lead_activities (lead_id, created_at desc);
create index if not exists lead_activities_due_idx  on lead_activities (due_at) where done_at is null and due_at is not null;

alter table lead_activities enable row level security;
revoke all on lead_activities from anon;
grant select, insert, update, delete on lead_activities to authenticated;
create policy lead_activities_team on lead_activities
  for all to authenticated using (is_team()) with check (is_team());

-- Cambiar de etapa deja rastro solo (actividad + bitácora).
create or replace function leads_stage_trail()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stage is distinct from old.stage then
    insert into lead_activities (lead_id, actor, kind, body)
    values (new.id, auth.uid(), 'etapa', old.stage || ' → ' || new.stage);
    if new.stage in ('contactado', 'cotizado') and new.last_contact_at is null then
      new.last_contact_at := now();
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists leads_stage_trail on leads;
create trigger leads_stage_trail before update on leads for each row execute function leads_stage_trail();

comment on table lead_activities is 'Bitácora del prospecto: notas, llamadas, tareas (due_at sin done_at = pendiente).';
