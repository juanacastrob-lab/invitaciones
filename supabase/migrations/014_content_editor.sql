-- =============================================================================
-- 014_content_editor.sql — Editor de contenido y más tipos de evento
--
-- Los novios (y el planner) editan el contenido de su invitación desde el
-- panel mientras esté en borrador o en revisión. La política de events solo
-- deja escribir al equipo, así que va por función: revisa acceso y estado.
-- =============================================================================

-- Tipos de evento que faltaban. No se usan en esta misma migración, así que
-- pueden ir en la misma query que lo demás.
alter type event_type add value if not exists 'primera_comunion';
alter type event_type add value if not exists 'confirmacion';

create or replace function rpc_update_event_content(p_event_id uuid, p_content jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_status event_status;
begin
  select status into v_status from events where id = p_event_id;
  if v_status is null or not can_see_event(p_event_id) then
    raise exception 'Sin acceso a este evento.';
  end if;
  if not is_team() and v_status not in ('borrador', 'en_revision') then
    raise exception 'La invitación ya está publicada: los cambios los hace el equipo.';
  end if;
  if jsonb_typeof(p_content) <> 'object' then
    raise exception 'Contenido inválido.';
  end if;

  update events set content = p_content where id = p_event_id;
  perform log_activity('event', p_event_id, 'update_content', jsonb_build_object('by', my_role()));
end;
$$;

revoke execute on function rpc_update_event_content(uuid, jsonb) from public;
grant  execute on function rpc_update_event_content(uuid, jsonb) to authenticated;
