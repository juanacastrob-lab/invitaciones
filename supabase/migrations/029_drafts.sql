-- =============================================================================
-- 029_drafts.sql — Borradores de la tienda y entrega del Express
--
-- El cliente arma su invitación antes de pagar; se guarda aquí con una clave
-- aleatoria (es su única credencial). Al pagar, el pedido apunta al borrador
-- y el evento nace con ese contenido. Lo no pagado caduca en 48 h.
-- =============================================================================

create table if not exists design_drafts (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique check (length(key) >= 24),
  package_code text not null,
  event_type   event_type not null default 'boda',
  template     text not null default 'aurora',
  locale       text not null default 'es',
  country      text not null default 'MX',
  email        text,
  phone        text,
  content      jsonb not null default '{}',          -- lo que llenó el cliente (formato del wizard)
  step         int not null default 0,
  order_id     uuid references orders on delete set null,
  expires_at   timestamptz not null default now() + interval '48 hours',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists design_drafts_expires_idx on design_drafts (expires_at) where order_id is null;
create trigger design_drafts_touch before update on design_drafts for each row execute function touch_updated_at();

-- Solo el servidor (service role) toca los borradores; el equipo puede verlos.
alter table design_drafts enable row level security;
revoke all on design_drafts from anon, authenticated;
grant select on design_drafts to authenticated;
create policy design_drafts_team on design_drafts
  for select to authenticated using (is_team());

-- Pedidos: de qué borrador salieron y cuándo se entrega el Express.
alter table orders
  add column if not exists draft_key    text,
  add column if not exists deliver_at   timestamptz,
  add column if not exists delivered_at timestamptz;
create index if not exists orders_deliver_idx on orders (deliver_at) where delivered_at is null and deliver_at is not null;

-- Al pagar un borrador ya no caduca.
create or replace function design_drafts_keep_paid()
returns trigger language plpgsql as $$
begin
  if new.order_id is not null then new.expires_at := now() + interval '10 years'; end if;
  return new;
end;
$$;
drop trigger if exists design_drafts_keep_paid on design_drafts;
create trigger design_drafts_keep_paid before update on design_drafts for each row execute function design_drafts_keep_paid();

comment on table design_drafts is 'Borradores del wizard de la tienda. key = credencial del cliente; caducan a las 48 h si no pagan.';
