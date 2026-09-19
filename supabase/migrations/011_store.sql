-- =============================================================================
-- 011_store.sql — Tienda: extras, pedidos y pagos
--
-- Sin Stripe todavía. "Tarjeta" es simulada (aprueba al instante) y
-- "transferencia" deja el pedido pendiente hasta que el equipo lo marque
-- pagado. Cuando entre Stripe, solo cambia cómo se aprueba la tarjeta.
-- =============================================================================

-- Extras: se venden aparte del paquete. Precios PROVISIONALES.
create table extras (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,
  name        text not null,
  description text,
  country     text not null check (country in ('MX', 'US', 'CA')),
  currency    text not null check (currency in ('MXN', 'USD', 'CAD')),
  price       numeric(10,2) not null check (price >= 0),
  /** Paquetes que ya lo traen incluido: no se ofrece como extra ahí. */
  included_in text[] not null default '{}',
  sort_order  int not null default 100,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (code, country)
);

create trigger extras_touch before update on extras for each row execute function touch_updated_at();

alter table extras enable row level security;
revoke all on extras from anon;
grant select on extras to authenticated;
create policy extras_select on extras for select to authenticated using (true);
create policy extras_admin_write on extras for all to authenticated using (is_admin()) with check (is_admin());

insert into extras (code, name, description, country, currency, price, included_in, sort_order) values
  ('envio_por_nosotros', 'Envío hecho por nosotros', 'Nuestro equipo manda cada invitación por WhatsApp a tu lista y lleva el control de quién la recibió.', 'MX', 'MXN', 900,  '{premium}', 10),
  ('recordatorios',      'Rondas de recordatorio',   'Dos rondas de recordatorio por WhatsApp a quienes no han confirmado.', 'MX', 'MXN', 500,  '{premium}', 20),
  ('qr_checkin',         'Pase con QR y check-in',   'Cada invitado recibe un pase con QR; el día del evento se escanea desde el celular.', 'MX', 'MXN', 800,  '{premium}', 30),
  ('save_the_date',      'Save the date',            'Una tarjeta previa, con la fecha y la foto, para mandar meses antes.', 'MX', 'MXN', 600,  '{premium}', 40),
  ('idioma_extra',       'Tercer idioma',            'Francés u otro idioma además de español e inglés.', 'MX', 'MXN', 700,  '{}', 50),
  ('musica',             'Música de fondo',          'Tu canción en la invitación (se reproduce cuando el invitado la toca).', 'MX', 'MXN', 300,  '{completo,premium}', 60),
  ('galeria_extra',      'Galería ampliada',         'Hasta 20 fotos en lugar de 6, optimizadas por nosotros.', 'MX', 'MXN', 400,  '{}', 70),
  ('cambios_extra',      'Cambios después de publicar', 'Hasta 3 rondas de cambios de texto o fotos después de que la invitación ya se mandó.', 'MX', 'MXN', 450,  '{}', 80),
  ('dominio_propio',     'Dominio propio',           'Tu invitación en tu propio dominio (ej. anayluis.com). Incluye un año de dominio.', 'MX', 'MXN', 1200, '{}', 90)
on conflict (code, country) do update
  set name = excluded.name, description = excluded.description, price = excluded.price,
      included_in = excluded.included_in, sort_order = excluded.sort_order;

-- Pedidos ---------------------------------------------------------------------

create type order_status   as enum ('pendiente', 'pagado', 'cancelado');
create type build_mode     as enum ('team', 'self', 'planner');
create type payment_method as enum ('card_sim', 'transfer', 'stripe');

create table orders (
  id             uuid primary key default gen_random_uuid(),
  number         serial,                                  -- para hablar con el cliente: "pedido 1042"
  user_id        uuid references auth.users on delete set null,
  lead_id        uuid references leads on delete set null,
  event_id       uuid references events on delete set null,
  event_type     event_type not null default 'boda',
  country        text not null check (country in ('MX', 'US', 'CA')),
  currency       text not null check (currency in ('MXN', 'USD', 'CAD')),
  package_code   text not null,
  package_name   text not null,
  package_price  numeric(10,2) not null,
  extras         jsonb not null default '[]',             -- [{code, name, price}]
  total          numeric(10,2) not null check (total >= 0),
  build_mode     build_mode not null default 'team',
  planner_email  text,
  payment_method payment_method not null,
  status         order_status not null default 'pendiente',
  paid_at        timestamptz,
  contact        jsonb not null,                          -- {partner_a, partner_b, email, phone}
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index orders_status_idx  on orders (status, created_at desc);
create index orders_user_idx    on orders (user_id);
create index orders_created_idx on orders (created_at desc);
create trigger orders_touch before update on orders for each row execute function touch_updated_at();

alter table orders enable row level security;
revoke all on orders from anon;
grant select, update on orders to authenticated;

create policy orders_select_team_or_own on orders
  for select to authenticated using (is_team() or user_id = auth.uid());

create policy orders_update_team on orders
  for update to authenticated using (is_team()) with check (is_team());

create table payments (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders on delete cascade,
  amount     numeric(10,2) not null,
  currency   text not null,
  method     payment_method not null,
  reference  text,                                        -- folio de transferencia, id de Stripe, 'SIMULADO'
  created_at timestamptz not null default now()
);

create index payments_order_idx on payments (order_id);

alter table payments enable row level security;
revoke all on payments from anon;
grant select on payments to authenticated;
create policy payments_select on payments
  for select to authenticated
  using (exists (select 1 from orders o where o.id = payments.order_id and (is_team() or o.user_id = auth.uid())));

-- Los pedidos y pagos se escriben solo desde el servidor (service role) o por
-- esta función, que usa el equipo para marcar pagada una transferencia.
create or replace function rpc_mark_order_paid(p_order_id uuid, p_reference text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  o orders%rowtype;
begin
  if not is_team() then
    raise exception 'Solo el equipo puede marcar pagos.';
  end if;
  select * into o from orders where id = p_order_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if o.status = 'pagado' then return jsonb_build_object('ok', true, 'already', true); end if;

  update orders set status = 'pagado', paid_at = now() where id = p_order_id;
  insert into payments (order_id, amount, currency, method, reference)
  values (p_order_id, o.total, o.currency, o.payment_method, nullif(trim(p_reference), ''));
  perform log_activity('order', p_order_id, 'paid', jsonb_build_object('reference', p_reference));

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function rpc_mark_order_paid(uuid, text) from public;
grant  execute on function rpc_mark_order_paid(uuid, text) to authenticated;
