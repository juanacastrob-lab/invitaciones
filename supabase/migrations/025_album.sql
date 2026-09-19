-- =============================================================================
-- 025_album.sql — Álbum de fotos de los invitados
--
-- Los invitados suben fotos desde /i/[slug]/fotos (link general o QR en las
-- mesas) sin cuenta: el servidor firma la subida con rate limit y registra la
-- foto aquí. El álbum se activa desde el editor (content.album.enabled).
-- Novios y equipo pueden borrar lo que no quieran.
-- =============================================================================

create table if not exists event_photos (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events on delete cascade,
  path          text not null,
  uploader_name text,
  caption       text,
  approved      boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists event_photos_event_idx on event_photos (event_id, created_at desc);

alter table event_photos enable row level security;
revoke all on event_photos from anon;
grant select, update, delete on event_photos to authenticated;
create policy event_photos_select on event_photos for select to authenticated using (can_see_event(event_id));
create policy event_photos_write  on event_photos for all to authenticated using (can_see_event(event_id)) with check (can_see_event(event_id));

create or replace function album_open(e events)
returns boolean language sql stable as $$
  select e.status in ('publicado', 'finalizado')
     and coalesce((e.content -> 'album' ->> 'enabled')::boolean, false);
$$;

-- Lista pública (solo aprobadas) para la página del álbum.
create or replace function rpc_album_list(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  e events%rowtype;
begin
  select * into e from events where slug = p_slug;
  if not found or not album_open(e) then return null; end if;
  return jsonb_build_object(
    'event_id', e.id,
    'couple', e.content -> 'couple',
    'template', e.template,
    'languages', to_jsonb(e.languages),
    'default_language', e.default_language,
    'title', e.content -> 'album' -> 'title',
    'note', e.content -> 'album' -> 'note',
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'path', p.path, 'uploader', p.uploader_name, 'caption', p.caption, 'created_at', p.created_at) order by p.created_at desc)
      from event_photos p where p.event_id = e.id and p.approved
    ), '[]'::jsonb)
  );
end;
$$;

-- Registrar una foto ya subida. Rate limit por visitante; nombres recortados.
create or replace function rpc_album_add(p_slug text, p_path text, p_uploader text, p_caption text, p_client_key text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  e events%rowtype;
  v_id uuid;
begin
  if p_client_key is not null and not rate_limit_check('album:' || p_client_key, 60, interval '1 hour') then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;
  select * into e from events where slug = p_slug;
  if not found or not album_open(e) then return jsonb_build_object('ok', false, 'error', 'closed'); end if;
  if p_path !~ ('^events/' || e.id::text || '/album/[A-Za-z0-9_-]+\.(webp|jpg|png)$') then
    return jsonb_build_object('ok', false, 'error', 'invalid_path');
  end if;
  insert into event_photos (event_id, path, uploader_name, caption)
  values (e.id, p_path, nullif(left(trim(coalesce(p_uploader, '')), 60), ''), nullif(left(trim(coalesce(p_caption, '')), 200), ''))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke execute on function rpc_album_list(text) from public;
revoke execute on function rpc_album_add(text, text, text, text, text) from public;
grant  execute on function rpc_album_list(text) to service_role;
grant  execute on function rpc_album_add(text, text, text, text, text) to service_role;
