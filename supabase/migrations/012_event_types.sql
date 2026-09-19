-- =============================================================================
-- 012_event_types.sql — Más tipos de evento
--
-- Va aparte porque Postgres no deja agregar valores a un enum y usarlos en
-- la misma transacción. Bodas primero; los demás quedan listos en la base.
-- =============================================================================

alter type event_type add value if not exists 'graduacion';
alter type event_type add value if not exists 'cumpleanos';
alter type event_type add value if not exists 'otro';
