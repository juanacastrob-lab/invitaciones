-- =============================================================================
-- 024_rsvp_extras.sql — Preguntas libres y niños en el RSVP; lluvia de sobres
--
-- Las preguntas las define cada evento en su contenido (rsvp.questions). Las
-- respuestas van en la misma fila del RSVP, en `answers`, y el número de niños
-- en `children_count`. Se guardan con una segunda función chica, para no
-- reescribir rpc_submit_rsvp.
-- =============================================================================

alter table rsvp_responses add column if not exists answers jsonb not null default '{}';
alter table rsvp_responses add column if not exists children_count int not null default 0 check (children_count >= 0);

create or replace function rpc_submit_rsvp_extra(p_slug text, p_token text, p_answers jsonb, p_children int default 0)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  e   events%rowtype;
  g   guests%rowtype;
  r   rsvp_responses%rowtype;
  v_ids text[];
  v_clean jsonb := '{}'::jsonb;
  k text; v text;
begin
  if not rate_limit_check('rsvp:extra:' || coalesce(p_token, ''), 30, interval '1 hour') then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;
  select * into e from events where slug = p_slug;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select * into g from guests where token = p_token and event_id = e.id;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid_token'); end if;
  select * into r from rsvp_responses where guest_id = g.id order by created_at desc limit 1;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  -- Solo se guardan respuestas a preguntas que el evento definió, recortadas.
  select coalesce(array_agg(q ->> 'id'), '{}') into v_ids from jsonb_array_elements(coalesce(e.content -> 'rsvp' -> 'questions', '[]'::jsonb)) q;
  if jsonb_typeof(p_answers) = 'object' then
    for k, v in select key, value #>> '{}' from jsonb_each(p_answers) loop
      if k = any(v_ids) and v is not null and length(trim(v)) > 0 then
        v_clean := v_clean || jsonb_build_object(k, left(trim(v), 300));
      end if;
    end loop;
  end if;

  update rsvp_responses
     set answers = v_clean,
         children_count = least(greatest(coalesce(p_children, 0), 0), greatest(r.count, 0))
   where id = r.id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function rpc_submit_rsvp_extra(text, text, jsonb, int) from public;
grant  execute on function rpc_submit_rsvp_extra(text, text, jsonb, int) to service_role;

-- rpc_get_invitation: igual que 018, más answers y children_count en la respuesta del invitado.
create or replace function rpc_get_invitation(p_slug text, p_token text default null, p_preview_key text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  e events%rowtype;
  g guests%rowtype;
  v_access text;
  v_content jsonb;
  v_guest jsonb;
  v_answer jsonb;
begin
  select * into e from events where slug = p_slug;
  if not found then return null; end if;
  if e.status in ('publicado', 'finalizado') then
    v_access := 'public';
  elsif p_preview_key is not null and p_preview_key = e.preview_key then
    v_access := 'preview';
  else
    return null;
  end if;
  if p_token is not null and length(p_token) between 8 and 64 then
    select * into g from guests where token = p_token and event_id = e.id;
    if found then v_access := 'token'; end if;
  end if;
  v_content := e.content;
  if v_access <> 'token' or not e.show_private_gifts then
    v_content := v_content #- '{gifts,bank}'::text[];
    if v_content ? 'gifts' then
      v_content := jsonb_set(v_content, '{gifts,envelopes}', 'false'::jsonb);
    end if;
  end if;
  if g.id is not null then
    select jsonb_build_object('attending', r.attending, 'count', r.count, 'attendee_names', to_jsonb(r.attendee_names),
             'menu_choices', r.menu_choices, 'dietary', r.dietary, 'song', r.song, 'message', r.message, 'created_at', r.created_at,
             'answers', coalesce(r.answers, '{}'::jsonb), 'children_count', coalesce(r.children_count, 0))
      into v_answer from rsvp_responses r where r.guest_id = g.id order by r.created_at desc limit 1;
    v_guest := jsonb_build_object('display_name', g.display_name, 'passes', g.passes, 'language', g.language, 'status', g.status,
      'confirmed_count', g.confirmed_count, 'group_tag', g.group_tag, 'responded_at', g.responded_at,
      'checked_in_at', g.checked_in_at, 'response', v_answer);
  end if;
  return jsonb_build_object(
    'access', v_access,
    'token_valid', (g.id is not null),
    'event', jsonb_build_object('slug', e.slug, 'type', e.type, 'template', e.template, 'languages', to_jsonb(e.languages),
      'default_language', e.default_language, 'timezone', e.timezone, 'status', e.status, 'rsvp_deadline', e.rsvp_deadline,
      'allow_public_rsvp', e.allow_public_rsvp, 'og_image_url', e.og_image_url, 'checkin_enabled', e.checkin_enabled,
      'content', v_content),
    'guest', v_guest
  );
end;
$$;
