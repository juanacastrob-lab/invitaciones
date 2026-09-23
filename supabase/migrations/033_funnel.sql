-- =============================================================================
-- 033_funnel.sql — Embudo de la tienda
--
-- Cada paso que da un visitante (portada, tienda, tipo, datos, vista previa,
-- paquete, pago, pedido, pagado) con su sesión anónima y su campaña. Solo el
-- servidor escribe; el equipo lee. Para ver dónde se atora la gente.
-- =============================================================================

create table if not exists funnel_events (
  id           bigint generated always as identity primary key,
  session_id   text not null,
  step         text not null,
  region       text,
  event_type   text,
  package_code text,
  draft_key    text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_content  text,
  meta         jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index if not exists funnel_events_created_idx on funnel_events (created_at desc);
create index if not exists funnel_events_session_idx on funnel_events (session_id, created_at);

alter table funnel_events enable row level security;
revoke all on funnel_events from anon, authenticated;
grant select on funnel_events to authenticated;
create policy funnel_events_team on funnel_events
  for select to authenticated using (is_team());
