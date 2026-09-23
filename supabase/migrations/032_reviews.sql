-- =============================================================================
-- 032_reviews.sql — Reseñas de clientes
--
-- Las dejan los novios desde su panel (una por evento); el equipo las aprueba
-- y salen en la portada. Nada público lee la tabla directo.
-- =============================================================================

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events on delete cascade,
  user_id     uuid references auth.users on delete set null,
  author_name text not null check (length(trim(author_name)) between 1 and 80),
  rating      int  not null check (rating between 1 and 5),
  body        text not null check (length(trim(body)) between 10 and 1000),
  event_type  event_type not null default 'boda',
  city        text,
  approved_at timestamptz,
  featured    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (event_id)
);
create index if not exists reviews_approved_idx on reviews (approved_at desc) where approved_at is not null;

alter table reviews enable row level security;
revoke all on reviews from anon;
grant select, insert on reviews to authenticated;
grant update, delete on reviews to authenticated;

-- Los novios ven y dejan la de su evento; el equipo ve todas.
create policy reviews_select on reviews
  for select to authenticated using (is_team() or can_see_event(event_id));
create policy reviews_insert_own on reviews
  for insert to authenticated with check (can_see_event(event_id) and user_id = auth.uid());
create policy reviews_update_team on reviews
  for update to authenticated using (is_team()) with check (is_team());
create policy reviews_delete_admin on reviews
  for delete to authenticated using (is_admin());

comment on table reviews is 'Reseñas de clientes. approved_at nulo = pendiente de revisar; featured = va primero en la portada.';
