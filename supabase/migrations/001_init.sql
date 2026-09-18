-- =============================================================================
-- 001_init.sql — Esquema inicial + RLS
--
-- Principio de seguridad de este archivo:
--   Los invitados NO tienen cuenta y NO tocan las tablas. Nadie sin sesión
--   (rol `anon`) tiene una sola política ni un solo permiso. Todo lo público
--   pasa por funciones `security definer` que solo puede ejecutar el servidor.
--   Aunque alguien adivine las URLs de la API de Supabase, la lista de
--   invitados es inalcanzable desde fuera.
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------

create type user_role    as enum ('admin', 'staff', 'client');
create type event_status as enum ('borrador', 'en_revision', 'publicado', 'finalizado', 'archivado');
create type event_type   as enum ('boda', 'xv', 'bautizo', 'baby_shower');
create type guest_status as enum ('pending', 'confirmed', 'declined');

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------

-- Token del invitado: 16 caracteres, ~96 bits de aleatoriedad, no secuencial.
-- Va en el link que se manda por WhatsApp, así que se busca corto pero
-- imposible de adivinar o de enumerar.
create or replace function gen_guest_token()
returns text
language sql
volatile
as $$
  select translate(encode(gen_random_bytes(12), 'base64'), '+/=', '-_x');
$$;

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

create table profiles (
  user_id    uuid primary key references auth.users on delete cascade,
  role       user_role   not null default 'client',
  name       text,
  phone      text,                                  -- E.164: +52..., +1...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'Datos y rol de cada usuario con cuenta. Los invitados no aparecen aquí.';

create table packages (
  id         uuid primary key default gen_random_uuid(),
  code       text          not null,
  name       text          not null,
  country    text          not null check (country  in ('MX', 'US', 'CA')),
  currency   text          not null check (currency in ('MXN', 'USD', 'CAD')),
  price      numeric(10,2) not null check (price >= 0),
  features   jsonb         not null default '[]',
  active     boolean       not null default true,
  created_at timestamptz   not null default now(),
  updated_at timestamptz   not null default now(),
  unique (code, country)
);

comment on table packages is 'Precios por país. Configurables, nunca escritos en el código.';

create table events (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid,                                    -- Fase 2
  slug               citext       not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  type               event_type   not null default 'boda',
  template           text         not null default 'aurora',
  languages          text[]       not null default '{es}',
  default_language   text         not null default 'es',
  timezone           text         not null default 'America/Mexico_City',
  status             event_status not null default 'borrador',
  content            jsonb        not null default '{}',      -- validado con Zod en la app
  rsvp_deadline      timestamptz,
  allow_public_rsvp  boolean      not null default false,     -- ¿el link sin token puede confirmar?
  show_private_gifts boolean      not null default true,      -- datos bancarios solo con token
  og_image_url       text,
  preview_key        text         not null default gen_guest_token(),
  created_by         uuid references auth.users on delete set null,
  created_at         timestamptz  not null default now(),
  updated_at         timestamptz  not null default now(),
  check (default_language = any (languages)),
  check (array_length(languages, 1) between 1 and 3)
);

comment on column events.preview_key is
  'Deja ver el evento antes de publicarlo, para que los novios revisen.';
comment on column events.show_private_gifts is
  'Los datos bancarios y de sobres solo se muestran en el link personal, que no se reenvía tanto.';

create table event_members (
  event_id   uuid        not null references events    on delete cascade,
  user_id    uuid        not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

comment on table event_members is 'Qué clientes (novios) ven qué evento.';

create table guests (
  id              uuid         primary key default gen_random_uuid(),
  event_id        uuid         not null references events on delete cascade,
  display_name    text         not null check (length(trim(display_name)) > 0),
  passes          int          not null default 1 check (passes between 1 and 30),
  phone           text,
  email           text,
  language        text         not null default 'es',
  token           text         not null unique default gen_guest_token(),
  group_tag       text,
  table_no        text,
  status          guest_status not null default 'pending',
  confirmed_count int          not null default 0 check (confirmed_count >= 0),
  sent_at         timestamptz,
  opened_at       timestamptz,
  responded_at    timestamptz,
  reminder_count  int          not null default 0 check (reminder_count >= 0),
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now(),
  check (confirmed_count <= passes)
);

create index guests_event_idx        on guests (event_id);
create index guests_event_status_idx on guests (event_id, status);

create table rsvp_responses (
  id             uuid        primary key default gen_random_uuid(),
  guest_id       uuid        not null references guests on delete cascade,
  attending      boolean     not null,
  count          int         not null default 0 check (count >= 0),
  attendee_names text[]      not null default '{}',
  menu_choices   jsonb       not null default '{}',
  dietary        text,
  song           text,
  message        text,
  locale         text,
  source         text        not null default 'token' check (source in ('token', 'public', 'admin')),
  created_at     timestamptz not null default now(),
  check (attending or count = 0)
);

create index rsvp_guest_idx on rsvp_responses (guest_id, created_at desc);

comment on table rsvp_responses is
  'Historial completo. La respuesta más reciente de cada invitado es la que cuenta.';

create table message_templates (
  id         uuid        primary key default gen_random_uuid(),
  key        text        not null,
  language   text        not null,
  body       text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (key, language)
);

create table activity_log (
  id         uuid        primary key default gen_random_uuid(),
  actor      uuid        references auth.users on delete set null,
  entity     text        not null,
  entity_id  uuid,
  action     text        not null,
  data       jsonb       not null default '{}',
  created_at timestamptz not null default now()
);

create index activity_log_entity_idx  on activity_log (entity, entity_id, created_at desc);
create index activity_log_created_idx on activity_log (created_at desc);

-- Rate limit del RSVP sin depender de Redis ni de ningún servicio extra.
create table rate_limit_hits (
  bucket text        not null,
  hit_at timestamptz not null default now()
);

create index rate_limit_bucket_idx on rate_limit_hits (bucket, hit_at desc);

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------

create trigger profiles_touch          before update on profiles          for each row execute function touch_updated_at();
create trigger packages_touch          before update on packages          for each row execute function touch_updated_at();
create trigger events_touch            before update on events            for each row execute function touch_updated_at();
create trigger guests_touch            before update on guests            for each row execute function touch_updated_at();
create trigger message_templates_touch before update on message_templates for each row execute function touch_updated_at();

-- -----------------------------------------------------------------------------
-- Alta automática de perfil al crearse una cuenta
-- -----------------------------------------------------------------------------

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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- -----------------------------------------------------------------------------
-- Helpers de permisos
--
-- `security definer` a propósito: leen `profiles`, que tiene RLS. Si no lo
-- fueran, se morderían la cola al evaluar las propias políticas.
-- -----------------------------------------------------------------------------

create or replace function my_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where user_id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(my_role() = 'admin', false);
$$;

create or replace function is_team()
returns boolean
language sql
stable
as $$
  select coalesce(my_role() in ('admin', 'staff'), false);
$$;

create or replace function can_see_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_team() or exists (
    select 1 from event_members m
    where m.event_id = p_event_id and m.user_id = auth.uid()
  );
$$;

-- El cliente puede editar su lista de invitados solo mientras el evento no
-- está publicado. Después, los cambios pasan por el equipo.
create or replace function event_is_editable_by_client(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from events e
    join event_members m on m.event_id = e.id
    where e.id = p_event_id
      and m.user_id = auth.uid()
      and e.status in ('borrador', 'en_revision')
  );
$$;

-- Bloquea que alguien se suba a sí mismo de rol editando su propio perfil.
create or replace function guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- `auth.uid() is null` = no hay sesion de usuario: es el servidor (service
  -- role) o el SQL Editor. Ahi si se permite, y es como se nombra al primer
  -- admin. Sin esta salida, el proyecto se queda sin forma de arrancar.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not is_admin() then
    raise exception 'Solo un admin puede cambiar el rol de un perfil.';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on profiles
  for each row execute function guard_profile_role();

-- =============================================================================
-- RLS
-- =============================================================================

alter table profiles          enable row level security;
alter table packages          enable row level security;
alter table events            enable row level security;
alter table event_members     enable row level security;
alter table guests            enable row level security;
alter table rsvp_responses    enable row level security;
alter table message_templates enable row level security;
alter table activity_log      enable row level security;
alter table rate_limit_hits   enable row level security;

-- Nadie sin sesión toca nada. Ni permisos, ni políticas.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

-- profiles ---------------------------------------------------------------
create policy profiles_select_self_or_team on profiles
  for select to authenticated
  using (user_id = auth.uid() or is_team());

create policy profiles_insert_self on profiles
  for insert to authenticated
  with check (user_id = auth.uid());

create policy profiles_update_self on profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy profiles_admin_all on profiles
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- packages ---------------------------------------------------------------
create policy packages_select on packages
  for select to authenticated
  using (true);

create policy packages_admin_write on packages
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- events -----------------------------------------------------------------
create policy events_select on events
  for select to authenticated
  using (can_see_event(id));

create policy events_insert_team on events
  for insert to authenticated
  with check (is_team());

create policy events_update_team on events
  for update to authenticated
  using (is_team())
  with check (is_team());

-- Borrar eventos es solo de admin: la administrativa no puede.
create policy events_delete_admin on events
  for delete to authenticated
  using (is_admin());

-- event_members ----------------------------------------------------------
create policy event_members_select on event_members
  for select to authenticated
  using (can_see_event(event_id));

create policy event_members_write_team on event_members
  for all to authenticated
  using (is_team())
  with check (is_team());

-- guests -----------------------------------------------------------------
create policy guests_select on guests
  for select to authenticated
  using (can_see_event(event_id));

create policy guests_write_team on guests
  for all to authenticated
  using (is_team())
  with check (is_team());

create policy guests_write_client on guests
  for all to authenticated
  using (event_is_editable_by_client(event_id))
  with check (event_is_editable_by_client(event_id));

-- rsvp_responses ---------------------------------------------------------
-- Solo lectura desde la app. Las respuestas entran por el RPC del invitado.
create policy rsvp_select on rsvp_responses
  for select to authenticated
  using (exists (
    select 1 from guests g
    where g.id = rsvp_responses.guest_id and can_see_event(g.event_id)
  ));

create policy rsvp_delete_admin on rsvp_responses
  for delete to authenticated
  using (is_admin());

-- message_templates ------------------------------------------------------
create policy message_templates_select on message_templates
  for select to authenticated
  using (true);

create policy message_templates_admin_write on message_templates
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- activity_log -----------------------------------------------------------
-- Se lee desde el panel; se escribe solo desde el servidor. Sin política de
-- insert, nadie puede falsear la bitácora ni borrarla.
create policy activity_log_select_team on activity_log
  for select to authenticated
  using (is_team());

-- rate_limit_hits --------------------------------------------------------
-- Sin ninguna política: solo el servidor la toca.

-- =============================================================================
-- Blindaje de funciones
--
-- Postgres le da permiso de ejecucion a PUBLIC por defecto, y Supabase publica
-- el esquema `public` como API. Sin esto, cualquiera sin cuenta podria llamar
-- estas funciones desde fuera. No filtran nada, pero no tienen por que estar
-- expuestas: se quitan de PUBLIC y se le dan solo a quien las necesita.
-- =============================================================================

revoke execute on function
  my_role(),
  is_admin(),
  is_team(),
  can_see_event(uuid),
  event_is_editable_by_client(uuid),
  gen_guest_token(),
  touch_updated_at(),
  guard_profile_role(),
  handle_new_user()
from public;

-- `authenticated` si las necesita: las politicas de RLS y los valores por
-- defecto de las columnas se evaluan con el permiso de quien hace la consulta.
grant execute on function
  my_role(),
  is_admin(),
  is_team(),
  can_see_event(uuid),
  event_is_editable_by_client(uuid),
  gen_guest_token()
to authenticated, service_role;
