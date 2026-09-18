-- =============================================================================
-- 021_planners.sql — Wedding planners con comisión
--
-- El admin da de alta al planner (correo, % de comisión). El planner comparte
-- su link /comprar?ref=CODIGO; los pedidos que entren por ahí llevan su
-- comisión. El planner entra como cualquier cliente y ve sus pedidos y lo
-- que se le debe; el admin marca las comisiones pagadas. Nada de dinero se
-- mueve solo.
-- =============================================================================

create table if not exists planners (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  user_id        uuid references auth.users on delete set null,
  name           text not null check (length(trim(name)) > 0),
  phone          text,
  code           text not null unique check (code ~ '^[A-Z0-9]{4,12}$'),
  commission_pct numeric(5,2) not null default 10 check (commission_pct between 0 and 50),
  active         boolean not null default true,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger planners_touch before update on planners for each row execute function touch_updated_at();

-- Si el planner ya tiene cuenta, se liga al crearlo; si no, al entrar (abajo).
create or replace function planners_link_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.email := lower(trim(new.email));
  if new.user_id is null then
    select user_id into new.user_id from profiles where email = new.email;
  end if;
  return new;
end;
$$;
create trigger planners_link before insert or update of email on planners for each row execute function planners_link_user();

alter table planners enable row level security;
revoke all on planners from anon;
grant select, insert, update on planners to authenticated;
create policy planners_select on planners for select to authenticated using (is_team() or user_id = auth.uid());
create policy planners_admin_write on planners for all to authenticated using (is_admin()) with check (is_admin());

alter table orders add column if not exists planner_id uuid references planners on delete set null;
alter table orders add column if not exists commission_amount numeric(10,2) not null default 0 check (commission_amount >= 0);
alter table orders add column if not exists commission_paid_at timestamptz;
create index if not exists orders_planner_idx on orders (planner_id) where planner_id is not null;

-- El planner ve los pedidos que trajo (además del equipo y del propio cliente).
drop policy if exists orders_select_team_or_own on orders;
create policy orders_select_team_or_own on orders
  for select to authenticated
  using (
    is_team() or user_id = auth.uid()
    or exists (select 1 from planners p where p.id = orders.planner_id and p.user_id = auth.uid())
  );

-- Al entrar con el correo del planner, queda ligado.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role := 'client';
begin
  if exists (select 1 from team_invites where lower(email) = lower(new.email) and accepted_at is null) then
    v_role := 'staff';
    update team_invites set accepted_at = now() where lower(email) = lower(new.email) and accepted_at is null;
  end if;

  insert into public.profiles (user_id, name, email, role)
  values (new.id, new.raw_user_meta_data ->> 'name', lower(new.email), v_role)
  on conflict (user_id) do update set email = excluded.email;

  update event_member_invites
     set user_id = new.id, accepted_at = now()
   where lower(email) = lower(new.email) and user_id is null;

  insert into event_members (event_id, user_id)
  select event_id, new.id from event_member_invites where user_id = new.id
  on conflict do nothing;

  update planners set user_id = new.id where email = lower(new.email) and user_id is null;

  return new;
end;
$$;

-- Marcar comisión pagada: solo admin (es dinero).
create or replace function rpc_mark_commission_paid(p_order_id uuid, p_paid boolean default true)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Solo el admin marca comisiones.';
  end if;
  update orders set commission_paid_at = case when p_paid then now() else null end
   where id = p_order_id and planner_id is not null;
  if not found then
    raise exception 'Pedido sin planner.';
  end if;
  perform log_activity('order', p_order_id, 'commission', jsonb_build_object('paid', p_paid));
end;
$$;

revoke execute on function rpc_mark_commission_paid(uuid, boolean) from public;
grant  execute on function rpc_mark_commission_paid(uuid, boolean) to authenticated;
