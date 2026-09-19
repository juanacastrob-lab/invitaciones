-- =============================================================================
-- 028_whatsapp_inbox.sql — Bandeja de WhatsApp (Cloud API de Meta)
--
-- Los mensajes entran por el webhook (service role) y el equipo los lee y
-- contesta desde el admin. Una conversación por teléfono; se liga sola al
-- prospecto con ese teléfono.
-- =============================================================================

create table if not exists wa_conversations (
  id              uuid primary key default gen_random_uuid(),
  phone           text not null unique,                 -- E.164 sin '+', como lo manda Meta
  name            text,                                 -- el nombre de perfil que manda Meta
  lead_id         uuid references leads on delete set null,
  assigned_to     uuid references auth.users on delete set null,
  last_message_at timestamptz not null default now(),
  last_inbound_at timestamptz,                          -- para la ventana de 24 h de Meta
  unread          int not null default 0,
  archived_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists wa_conversations_last_idx on wa_conversations (last_message_at desc);

create table if not exists wa_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references wa_conversations on delete cascade,
  direction       text not null check (direction in ('in', 'out')),
  wa_id           text unique,                          -- id de Meta; evita duplicados del webhook
  body            text,
  media_type      text,                                 -- image, audio, document, sticker...
  media_id        text,
  status          text not null default 'received' check (status in ('received','sent','delivered','read','failed')),
  error           text,
  sent_by         uuid references auth.users on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists wa_messages_conv_idx on wa_messages (conversation_id, created_at);

alter table wa_conversations enable row level security;
alter table wa_messages enable row level security;
revoke all on wa_conversations, wa_messages from anon;
grant select, update on wa_conversations to authenticated;
grant select on wa_messages to authenticated;
create policy wa_conversations_team on wa_conversations
  for all to authenticated using (is_team()) with check (is_team());
create policy wa_messages_team on wa_messages
  for select to authenticated using (is_team());

-- Marcar leída: pone unread en 0.
create or replace function rpc_wa_mark_read(p_conversation_id uuid)
returns void language sql security definer set search_path = public as $$
  update wa_conversations set unread = 0 where id = p_conversation_id and is_team();
$$;
revoke all on function rpc_wa_mark_read(uuid) from public;
grant execute on function rpc_wa_mark_read(uuid) to authenticated;

comment on table wa_conversations is 'Una por teléfono. unread cuenta mensajes entrantes sin leer.';
