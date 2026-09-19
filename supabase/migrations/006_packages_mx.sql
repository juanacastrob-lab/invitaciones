-- =============================================================================
-- 006_packages_mx.sql — Paquetes de México con los precios de Juan
--
-- Cuatro niveles. El reparto de qué trae cada uno es una PROPUESTA: Juan lo
-- ajusta desde el admin o con un update. US y CA quedan inactivos hasta que
-- tengan precio real: un precio inventado no debe estar a la venta.
-- Se puede correr las veces que haga falta.
-- =============================================================================

-- Los códigos anteriores de MX se retiran (no se borran, por si ya hay pedidos).
update packages set active = false where country = 'MX';

insert into packages (code, name, country, currency, price, features, active) values
  ('basico',   'Básico',   'MX', 'MXN', 1399,
   '["invitacion_pdf","diseno_desde_plantilla","entrega_whatsapp"]', true),
  ('esencial', 'Esencial', 'MX', 'MXN', 2800,
   '["invitacion_web","rsvp","panel_novios","idiomas_es_en","itinerario_mapas","calendario","mesa_regalos","hospedaje","faq"]', true),
  ('completo', 'Completo', 'MX', 'MXN', 4800,
   '["invitacion_web","rsvp","panel_novios","idiomas_es_en","itinerario_mapas","calendario","mesa_regalos","hospedaje","faq","pases_personalizados","cola_whatsapp","galeria","musica","menu_rsvp","export_excel"]', true),
  ('premium',  'Premium',  'MX', 'MXN', 5900,
   '["invitacion_web","rsvp","panel_novios","idiomas_es_en","itinerario_mapas","calendario","mesa_regalos","hospedaje","faq","pases_personalizados","cola_whatsapp","galeria","musica","menu_rsvp","export_excel","envio_por_nosotros","recordatorios","qr_checkin","save_the_date"]', true)
on conflict (code, country) do update
  set name = excluded.name,
      currency = excluded.currency,
      price = excluded.price,
      features = excluded.features,
      active = excluded.active;

-- US y CA: sin precio definido todavía.
update packages set active = false where country in ('US', 'CA');
