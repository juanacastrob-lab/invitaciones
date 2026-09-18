-- =============================================================================
-- 003_guest_access.sql — Cómo entra un invitado sin tener cuenta
--
-- Los invitados no tocan las tablas: entran por estas funciones. Son
-- `security definer` y solo las puede ejecutar `service_role`, o sea el
-- servidor de la app. Desde fuera de Supabase no hay forma de llamarlas.
--
-- Lo que estas funciones NO devuelven nunca, aunque el token sea válido:
--   - la lista de invitados del evento
--   - los datos de cualquier otro invitado
--   - el id interno del evento, ni el `preview_key`
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Rate limit, sin Redis ni servicios extra
-- -----------------------------------------------------------------------------

create or replace function rate_limit_check(
  p_bucket text,
  p_max    int,
  p_window interval
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_hits int;
begin
  -- Limpieza barata: una de cada cien llamadas barre lo viejo, en vez de
  -- pagar un delete completo en cada confirmación.
  if random() < 0.01 then
    delete from rate_limit_hits where hit_at < now() - interval '1 day';
  end if;

  select count(*) into v_hits
  from rate_limit_hits
  where bucket = p_bucket and hit_at > now() - p_window;

  if v_hits >= p_max then
    return false;
  end if;

  insert into rate_limit_hits (bucket) values (p_bucket);
  return true;
end;
$$;

comment on function rate_limit_check is
  'true = adelante. Cuenta intentos por bucket (ip, token) en una ventana.';

-- -----------------------------------------------------------------------------
-- Leer la invitación
-- -----------------------------------------------------------------------------

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
      'content',           v_content
    ),
    'guest', v_guest
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Primera apertura del link personal
-- -----------------------------------------------------------------------------

create or replace function rpc_mark_opened(p_slug text, p_token text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  update guests g
     set opened_at = now()
    from events e
   where g.token = p_token
     and g.event_id = e.id
     and e.slug = p_slug
     and g.opened_at is null;
end;
$$;

comment on function rpc_mark_opened is
  'Solo marca la primera vez. Sirve para la ronda de recordatorios a quienes abrieron sin confirmar.';

-- -----------------------------------------------------------------------------
-- Permisos: solo el servidor
-- -----------------------------------------------------------------------------

revoke execute on function
  rate_limit_check(text, int, interval),
  rpc_get_invitation(text, text, text),
  rpc_mark_opened(text, text)
from public;

grant execute on function
  rate_limit_check(text, int, interval),
  rpc_get_invitation(text, text, text),
  rpc_mark_opened(text, text)
to service_role;
