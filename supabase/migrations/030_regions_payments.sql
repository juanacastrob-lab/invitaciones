-- =============================================================================
-- 030_regions_payments.sql — Tipos de evento de EE. UU./Canadá y Apple Pay
--
-- Solo agrega valores a enums. Cada ALTER TYPE va solo (Postgres no deja usar
-- el valor nuevo en la misma transacción); se puede correr varias veces.
-- =============================================================================

alter type event_type add value if not exists 'bar_mitzvah';
alter type event_type add value if not exists 'bridal_shower';
alter type event_type add value if not exists 'engagement';
alter type event_type add value if not exists 'anniversary';
alter type payment_method add value if not exists 'apple_pay';
