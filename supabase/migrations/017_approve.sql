-- =============================================================================
-- 017_approve.sql — Los novios aprueban su invitación desde el panel
--
-- El equipo la pone "en revisión"; los novios (o el planner) la revisan y al
-- aprobar queda publicada. Solo desde en_revision, solo miembros del evento,
-- y queda en la bitácora quién aprobó.
-- =============================================================================

create or replace function rpc_approve_event(p_event_id uuid)
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
  if v_status <> 'en_revision' then
    raise exception 'La invitación no está en revisión.';
  end if;

  update events set status = 'publicado' where id = p_event_id;
  perform log_activity('event', p_event_id, 'approved', jsonb_build_object('by', my_role()));
end;
$$;

revoke execute on function rpc_approve_event(uuid) from public;
grant  execute on function rpc_approve_event(uuid) to authenticated;
