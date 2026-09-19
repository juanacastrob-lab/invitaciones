-- =============================================================================
-- 004_rsvp.sql — Confirmación de asistencia
--
-- Toda la validación vive aquí, no en el navegador. Lo que llega del celular
-- de un invitado no es de fiar: los límites de pases, la fecha límite y las
-- opciones de menú se comprueban contra la base, no contra lo que diga el
-- formulario.
--
-- No lanza excepciones por errores esperables: devuelve {ok:false, error:...}
-- con un código que la app traduce al idioma del invitado.
-- =============================================================================

create or replace function rpc_submit_rsvp(
  p_slug       text,
  p_token      text,
  p_payload    jsonb,
  p_client_key text default null   -- huella del visitante, para el rate limit
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  e             events%rowtype;
  g             guests%rowtype;
  v_attending   boolean;
  v_count       int;
  v_names       text[];
  v_menu        jsonb;
  v_dietary     text;
  v_song        text;
  v_message     text;
  v_locale      text;
  v_ask_menu    boolean;
  v_valid_menu  text[];
  v_choice      text;
  v_response_id uuid;
begin
  -- Rate limit antes que nada: que un ataque no llegue ni a consultar.
  if not rate_limit_check('rsvp:token:' || coalesce(p_token, '-'), 10, interval '1 hour') then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;

  if p_client_key is not null
     and not rate_limit_check('rsvp:client:' || p_client_key, 30, interval '1 hour') then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;

  select * into e from events where slug = p_slug;
  if not found or e.status not in ('publicado', 'finalizado') then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into g from guests where token = p_token and event_id = e.id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  if e.rsvp_deadline is not null and now() > e.rsvp_deadline then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;

  -- ---------------------------------------------------------------------
  -- Lectura y validación de lo que mandó el invitado
  -- ---------------------------------------------------------------------

  -- `coalesce` porque si la clave no viene, jsonb_typeof devuelve NULL y la
  -- comparacion se queda en NULL: el if no dispara y pasaria un valor vacio.
  if coalesce(jsonb_typeof(p_payload -> 'attending'), 'ausente') <> 'boolean' then
    return jsonb_build_object('ok', false, 'error', 'invalid_payload');
  end if;
  v_attending := (p_payload ->> 'attending')::boolean;

  if v_attending then
    if coalesce(jsonb_typeof(p_payload -> 'count'), 'ausente') <> 'number' then
      return jsonb_build_object('ok', false, 'error', 'invalid_count');
    end if;
    v_count := (p_payload ->> 'count')::int;
    if v_count < 1 then
      return jsonb_build_object('ok', false, 'error', 'invalid_count');
    end if;
    -- El límite de pases es del evento, no del formulario.
    if v_count > g.passes then
      return jsonb_build_object(
        'ok', false, 'error', 'too_many_passes', 'passes', g.passes
      );
    end if;
  else
    v_count := 0;   -- "no asisto" siempre es cero, diga lo que diga el payload
  end if;

  select coalesce(array_agg(left(trim(n), 80)), '{}')
    into v_names
    from jsonb_array_elements_text(
           case when jsonb_typeof(p_payload -> 'attendee_names') = 'array'
                then p_payload -> 'attendee_names'
                else '[]'::jsonb end
         ) as n
   where trim(n) <> '';

  if array_length(v_names, 1) > v_count then
    return jsonb_build_object('ok', false, 'error', 'too_many_names');
  end if;

  -- Menú: los valores tienen que ser opciones que el evento realmente ofrece.
  v_ask_menu := coalesce((e.content -> 'rsvp' ->> 'askMenu')::boolean, false);
  v_menu := case when jsonb_typeof(p_payload -> 'menu_choices') = 'object'
                 then p_payload -> 'menu_choices'
                 else '{}'::jsonb end;

  if v_menu <> '{}'::jsonb then
    if not v_ask_menu or not v_attending then
      v_menu := '{}'::jsonb;
    else
      select coalesce(array_agg(opt ->> 'id'), '{}')
        into v_valid_menu
        from jsonb_array_elements(e.content -> 'rsvp' -> 'menuOptions') as opt;

      for v_choice in select value from jsonb_each_text(v_menu) loop
        if not (v_choice = any (v_valid_menu)) then
          return jsonb_build_object('ok', false, 'error', 'menu_invalid');
        end if;
      end loop;
    end if;
  end if;

  -- Texto libre: recortado, no rechazado. Un invitado que escribe de más
  -- merece que se guarde su mensaje, no un error en la cara.
  v_dietary := nullif(left(trim(coalesce(p_payload ->> 'dietary', '')), 500), '');
  v_song    := nullif(left(trim(coalesce(p_payload ->> 'song',    '')), 200), '');
  v_message := nullif(left(trim(coalesce(p_payload ->> 'message', '')), 1000), '');
  v_locale  := nullif(left(trim(coalesce(p_payload ->> 'locale',  '')), 8), '');

  if not v_attending then
    v_menu    := '{}'::jsonb;
    v_names   := '{}';
    v_dietary := null;
    v_song    := null;
  end if;

  -- ---------------------------------------------------------------------
  -- Guardar
  -- ---------------------------------------------------------------------

  insert into rsvp_responses (
    guest_id, attending, count, attendee_names, menu_choices,
    dietary, song, message, locale, source
  )
  values (
    g.id, v_attending, v_count, v_names, v_menu,
    v_dietary, v_song, v_message, v_locale, 'token'
  )
  returning id into v_response_id;

  update guests
     set status          = case when v_attending
                             then 'confirmed'::guest_status
                             else 'declined'::guest_status
                           end,
         confirmed_count = v_count,
         responded_at    = now(),
         opened_at       = coalesce(opened_at, now())
   where id = g.id;

  return jsonb_build_object(
    'ok',              true,
    'response_id',     v_response_id,
    'attending',       v_attending,
    'count',           v_count,
    'passes',          g.passes,
    'display_name',    g.display_name
  );
end;
$$;

comment on function rpc_submit_rsvp is
  'Guarda una confirmación. El historial queda completo; la última respuesta es la que cuenta.';

revoke execute on function rpc_submit_rsvp(text, text, jsonb, text) from public;
grant  execute on function rpc_submit_rsvp(text, text, jsonb, text) to service_role;
