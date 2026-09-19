-- =============================================================================
-- 023_sweet_sixteen.sql — Tipo de evento Sweet Sixteen (EE. UU.)
--
-- Va solo en su query, como 012: Postgres no deja agregar un valor a un enum
-- y usarlo en la misma transacción.
-- =============================================================================

alter type event_type add value if not exists 'sweet_sixteen';
