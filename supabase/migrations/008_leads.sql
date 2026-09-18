-- =============================================================================
-- 008_leads.sql — Prospectos que llegan desde la landing
--
-- Cada formulario enviado es un lead. Se guarda desde el servidor (service
-- role): ni el navegador ni un usuario con cuenta insertan aquí directo.
-- El equipo lo ve y lo trabaja; el propio prospecto puede ver lo suyo.
-- =============================================================================

create type lead_stage as enum (
  'nuevo', 'contactado', 'cotizado', 'anticipo', 'en_produccion', 'entregado', 'perdido'
);

create table leads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users on delete set null,   -- si se registró
  partner_a       text not null check (length(trim(partner_a)) > 0),
  partner_b       text not null check (length(trim(partner_b)) > 0),
  email           text not null,
  phone           text not null,                                     -- E.164
  country         text not null check (country in ('MX', 'US', 'CA')),
  language        text not null default 'es',
  event_type      event_type not null default 'boda',
  event_date      date,
  city            text,
  guests_estimate int check (guests_estimate between 1 and 5000),
  package_code    text,
  message         text,
  source          text,                                              -- 'landing', 'whatsapp', ...
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_content     text,
  stage           lead_stage not null default 'nuevo',
  next_follow_up  date,
  notes           text,
  consent_at      timestamptz not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index leads_stage_idx   on leads (stage, created_at desc);
create index leads_created_idx on leads (created_at desc);
create index leads_email_idx   on leads (lower(email));

create trigger leads_touch before update on leads for each row execute function touch_updated_at();

alter table leads enable row level security;
revoke all on leads from anon;
grant select, update, delete on leads to authenticated;

create policy leads_select_team_or_own on leads
  for select to authenticated
  using (is_team() or user_id = auth.uid());

create policy leads_update_team on leads
  for update to authenticated
  using (is_team())
  with check (is_team());

create policy leads_delete_admin on leads
  for delete to authenticated
  using (is_admin());
