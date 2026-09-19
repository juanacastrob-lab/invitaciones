-- =============================================================================
-- 026_express.sql — Paquete Express (MX)
--
-- Lo mismo que Básico (PDF desde plantilla, entrega por WhatsApp) a $899,
-- con la promesa de entrega en 20 minutos. Se puede correr varias veces.
-- =============================================================================

insert into packages (code, name, country, currency, price, features, active) values
  ('express', 'Express', 'MX', 'MXN', 899,
   '["invitacion_pdf","diseno_desde_plantilla","entrega_whatsapp","entrega_20_min"]', true)
on conflict (code, country) do update
  set name = excluded.name,
      currency = excluded.currency,
      price = excluded.price,
      features = excluded.features,
      active = excluded.active;
