-- =============================================================================
-- 018_checkin.sql — Pase con QR y check-in el día del evento
--
-- Con `events.checkin_enabled`, el invitado confirmado ve un pase con QR en
-- su link personal. El día del evento, el equipo (o los novios / planner)
-- escanea desde /checkin/[evento] y marca la llegada. El QR es el propio
-- link personal: nada nuevo que adivinar.
-- =============================================================================

alter table events add column if not exists checkin_enabled boolean not null default false;
alter table guests add column if not exists checked_in_at timestamptz;
alter table guests add column if not exists checked_in_count int not null default 0 check (checked_in_count >= 0);

-- rpc_get_invitation: igual que en 003, más checkin_enabled y checked_in_at.
create or replace function rpc_get_invitation(
  p_slug        text,
  p_token       text default null,
  p_preview_key text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  e         events%rowtype;
  g         guests%rowtype;
  v_access  text;
  v_content jsonb;
  v_guest   jsonb;
  v_answer  jsonb;
begin
  select * into e from events where slug = p_slug;
  if not found then
    return null;
  end if;

  if e.status in ('publicado', 'finalizado') then
    v_access := 'public';
  elsif p_preview_key is not null and p_preview_key = e.preview_key then
    -- Los novios revisando su borrador antes de publicar.
    v_access := 'preview';
  else
    -- Un borrador sin la llave de revisión se comporta como si no existiera.
    return null;
  end if;

  -- El token identifica al invitado. Uno inválido no da pistas: se cae al
  -- link general, igual que si no hubiera traído token.
  if p_token is not null and length(p_token) between 8 and 64 then
    select * into g from guests where token = p_token and event_id = e.id;
    if found then
      v_access := 'token';
    end if;
  end if;

  v_content := e.content;

  -- Datos bancarios y sobres: solo en el link personal, que no se reenvía
  -- tanto como el general. Se quitan del JSON antes de que salga de la base.
  if v_access <> 'token' or not e.show_private_gifts then
    v_content := v_content #- '{gifts,bank}'::text[];
    if v_content ? 'gifts' then
      v_content := jsonb_set(v_content, '{gifts,envelopes}', 'false'::jsonb);
    end if;
  end if;

  if g.id is not null then
    -- La última respuesta es la que cuenta; el historial se queda en la base.
    select jsonb_build_object(
             'attending',      r.attending,
             'count',          r.count,
             'attendee_names', to_jsonb(r.attendee_names),
             'menu_choices',   r.menu_choices,
             'dietary',        r.dietary,
             'song',           r.song,
             'message',        r.message,
             'created_at',     r.created_at
           )
      into v_answer
      from rsvp_responses r
     where r.guest_id = g.id
     order by r.created_at desc
     limit 1;

    v_guest := jsonb_build_object(
      'display_name',    g.display_name,
      'passes',          g.passes,
      'language',        g.language,
      'status',          g.status,
      'confirmed_count', g.confirmed_count,
      'group_tag',       g.group_tag,
      'responded_at',    g.responded_at,
      'checked_in_at',   g.checked_in_at,
      'response',        v_answer
    );
  end if;

  return jsonb_build_object(
    'access',      v_access,
    'token_valid', (g.id is not null),
    'event', jsonb_build_object(
      'slug',              e.slug,
      'type',              e.type,
      'template',          e.template,
      'languages',         to_jsonb(e.languages),
      'default_language',  e.default_language,
      'timezone',          e.timezone,
      'status',            e.status,
      'rsvp_deadline',     e.rsvp_deadline,
      'allow_public_rsvp', e.allow_public_rsvp,
      'og_image_url',      e.og_image_url,
      'checkin_enabled',   e.checkin_enabled,
      'content',           v_content
    ),
    'guest', v_guest
  );
end;
$$;

-- Marcar llegada. Por token (escaneo) o por id (búsqueda manual).
-- p_count = 0 deshace; null = automático (los que confirmó, o sus pases si no confirmó;
-- si ya había llegado, se queda como estaba y solo se avisa).
create or replace function rpc_checkin(p_event_id uuid, p_count int, p_token text default null, p_guest_id uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  g guests%rowtype;
  v_already boolean;
begin
  if not can_see_event(p_event_id) then
    raise exception 'Sin acceso a este evento.';
  end if;
  if p_token is not null then
    select * into g from guests where event_id = p_event_id and token = p_token for update;
  elsif p_guest_id is not null then
    select * into g from guests where event_id = p_event_id and id = p_guest_id for update;
  end if;
  if g.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  v_already := g.checked_in_at is not null;
  if p_count is null then
    p_count := case
      when v_already then g.checked_in_count
      when g.status = 'confirmed' then greatest(g.confirmed_count, 1)
      else g.passes
    end;
  end if;
  update guests
     set checked_in_count = least(greatest(p_count, 0), passes),
         checked_in_at    = case when p_count > 0 then coalesce(checked_in_at, now()) else null end
   where id = g.id
   returning * into g;

  perform log_activity('guest', g.id, 'checkin', jsonb_build_object('count', g.checked_in_count));

  return jsonb_build_object(
    'ok', true,
    'already', v_already,
    'guest', jsonb_build_object(
      'id', g.id, 'display_name', g.display_name, 'passes', g.passes, 'status', g.status,
      'confirmed_count', g.confirmed_count, 'table_no', g.table_no, 'group_tag', g.group_tag,
      'checked_in_at', g.checked_in_at, 'checked_in_count', g.checked_in_count
    )
  );
end;
$$;

revoke execute on function rpc_checkin(uuid, int, text, uuid) from public;
grant  execute on function rpc_checkin(uuid, int, text, uuid) to authenticated;

-- Totales de llegada en las estadísticas del evento (columnas nuevas al final).
create or replace view event_stats with (security_invoker = true) as
select
  e.id as event_id,
  count(g.id)::int                                                  as guests,
  coalesce(sum(g.passes), 0)::int                                   as passes,
  coalesce(sum(g.confirmed_count), 0)::int                          as confirmed_people,
  count(g.id) filter (where g.status = 'confirmed')::int            as confirmed,
  count(g.id) filter (where g.status = 'declined')::int             as declined,
  count(g.id) filter (where g.status = 'pending')::int              as pending,
  count(g.id) filter (where g.status = 'pending' and g.opened_at is not null)::int as opened_pending,
  count(g.id) filter (where g.sent_at is not null)::int             as sent,
  count(g.id) filter (where g.checked_in_at is not null)::int       as checked_in,
  coalesce(sum(g.checked_in_count), 0)::int                         as checked_in_people
from events e
left join guests g on g.event_id = e.id
group by e.id;

grant select on event_stats to authenticated;
