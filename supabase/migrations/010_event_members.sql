-- =============================================================================
-- 010_event_members.sql — Darle acceso a los novios a su evento
--
-- El equipo escribe el correo de los novios. Si ya tienen cuenta, quedan
-- ligados al momento; si no, quedan "invitados" y se ligan solos la primera
-- vez que entran (con Google o con el link del correo).
-- =============================================================================

create table event_member_invites (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events on delete cascade,
  email       text not null,
  user_id     uuid references auth.users on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (event_id, email)
);

alter table event_member_invites enable row level security;
revoke all on event_member_invites from anon;
grant select, delete on event_member_invites to authenticated;

create policy invites_select_team on event_member_invites
  for select to authenticated using (is_team());

create policy invites_delete_team on event_member_invites
  for delete to authenticated using (is_team());

-- Ligar un correo a un evento. Solo el equipo. Busca en auth.users, que los
-- clientes no pueden leer; por eso es security definer con su propio candado.
create or replace function rpc_add_event_member(p_event_id uuid, p_email text)
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
  if not is_team() then
    raise exception 'Solo el equipo puede dar acceso a un evento.';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'error', 'email_invalid');
  end if;

  select id into v_user from auth.users where lower(email) = v_email limit 1;

  insert into event_member_invites (event_id, email, user_id, accepted_at)
  values (p_event_id, v_email, v_user, case when v_user is null then null else now() end)
  on conflict (event_id, email) do update
    set user_id = coalesce(excluded.user_id, event_member_invites.user_id),
        accepted_at = coalesce(event_member_invites.accepted_at, excluded.accepted_at);

  if v_user is not null then
    insert into event_members (event_id, user_id) values (p_event_id, v_user)
    on conflict do nothing;
  end if;

  perform log_activity('event', p_event_id, 'add_member', jsonb_build_object('email', v_email, 'linked', v_user is not null));

  return jsonb_build_object('ok', true, 'linked', v_user is not null);
end;
$$;

revoke execute on function rpc_add_event_member(uuid, text) from public;
grant  execute on function rpc_add_event_member(uuid, text) to authenticated;

-- Al quitar la invitación se quita también el acceso.
create or replace function on_invite_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.user_id is not null then
    delete from event_members where event_id = old.event_id and user_id = old.user_id;
  end if;
  return old;
end;
$$;

create trigger invites_revoke_access
  after delete on event_member_invites
  for each row execute function on_invite_deleted();

-- Cuando alguien crea su cuenta, se le liga a lo que ya lo estaba esperando.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, name)
  values (new.id, new.raw_user_meta_data ->> 'name')
  on conflict (user_id) do nothing;

  update event_member_invites
     set user_id = new.id, accepted_at = now()
   where lower(email) = lower(new.email) and user_id is null;

  insert into event_members (event_id, user_id)
  select event_id, new.id from event_member_invites where user_id = new.id
  on conflict do nothing;

  return new;
end;
$$;
