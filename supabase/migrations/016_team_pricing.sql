-- =============================================================================
-- 016_team_pricing.sql — Equipo (staff por invitación) y paquete por evento
--
-- El admin invita a su equipo por correo desde /admin/team. Cuando esa
-- persona entra (Google o link por correo) queda como `staff`: puede operar
-- todo menos borrar eventos, cambiar precios y manejar el equipo. Nadie se
-- vuelve admin desde la app: eso solo se hace por SQL.
-- =============================================================================

-- Correo en el perfil, para que el admin vea a quién le dio acceso.
alter table profiles add column if not exists email text;
update profiles p set email = lower(u.email) from auth.users u where u.id = p.user_id and p.email is null;

-- Paquete con el que se vendió el evento (basico = solo PDF, sin RSVP).
alter table events add column if not exists package_code text;

create table if not exists team_invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  role        user_role not null default 'staff' check (role in ('staff')),
  created_by  uuid references auth.users on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table team_invites enable row level security;
revoke all on team_invites from anon;
grant select, insert, delete on team_invites to authenticated;
create policy team_invites_admin on team_invites for all to authenticated using (is_admin()) with check (is_admin());

-- Al crear la cuenta: perfil con correo, invitaciones a eventos, y rol staff
-- si el admin lo invitó al equipo.
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

  return new;
end;
$$;

-- Invitar al equipo. Si la persona ya tiene cuenta, se vuelve staff ahora mismo.
create or replace function rpc_invite_staff(p_email text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_user  uuid;
begin
  if not is_admin() then
    raise exception 'Solo el admin maneja el equipo.';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Correo inválido.';
  end if;

  select user_id into v_user from profiles where email = v_email;
  if v_user is not null then
    if v_user = auth.uid() then
      raise exception 'Ese es tu propio correo.';
    end if;
    update profiles set role = 'staff' where user_id = v_user and role <> 'admin';
    insert into team_invites (email, created_by, accepted_at) values (v_email, auth.uid(), now())
    on conflict (email) do update set accepted_at = now();
    perform log_activity('profile', v_user, 'role', jsonb_build_object('to', 'staff'));
    return jsonb_build_object('ok', true, 'active', true);
  end if;

  insert into team_invites (email, created_by) values (v_email, auth.uid())
  on conflict (email) do update set accepted_at = null, created_by = auth.uid();
  return jsonb_build_object('ok', true, 'active', false);
end;
$$;

-- Cambiar el rol de alguien. Candados: solo admin, nunca a sí mismo, nunca
-- puede crear otro admin ni degradar a uno.
create or replace function rpc_set_role(p_user_id uuid, p_role user_role)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_current user_role;
begin
  if not is_admin() then
    raise exception 'Solo el admin maneja el equipo.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'No puedes cambiar tu propio rol.';
  end if;
  if p_role = 'admin' then
    raise exception 'Los admin solo se nombran por SQL.';
  end if;
  select role into v_current from profiles where user_id = p_user_id;
  if v_current is null then
    raise exception 'Perfil no encontrado.';
  end if;
  if v_current = 'admin' then
    raise exception 'No se puede cambiar el rol de un admin desde la app.';
  end if;

  update profiles set role = p_role where user_id = p_user_id;
  if p_role = 'client' then
    delete from team_invites where email = (select email from profiles where user_id = p_user_id);
  end if;
  perform log_activity('profile', p_user_id, 'role', jsonb_build_object('from', v_current, 'to', p_role));
end;
$$;

revoke execute on function rpc_invite_staff(text) from public;
revoke execute on function rpc_set_role(uuid, user_role) from public;
grant  execute on function rpc_invite_staff(text) to authenticated;
grant  execute on function rpc_set_role(uuid, user_role) to authenticated;
