-- =============================================================================
-- 031_packages_2026.sql — Paquetes de lanzamiento (México)
--
-- Express $399 · Esencial $690 · Con pases $1,190 · Premium $1,990.
-- Los códigos viejos (basico, completo) se apagan, no se borran. Se puede
-- correr varias veces.
-- =============================================================================

update packages set active = false where country = 'MX';

insert into packages (code, name, country, currency, price, features, active) values
  ('express',   'Express',   'MX', 'MXN', 399,
   '["invitacion_pdf","diseno_desde_plantilla","entrega_correo","entrega_20_min"]', true),
  ('esencial',  'Esencial',  'MX', 'MXN', 690,
   '["invitacion_web","link_general","itinerario_mapas","mesa_regalos","rsvp_formulario","calendario","galeria","idiomas_es_en"]', true),
  ('con_pases', 'Con pases', 'MX', 'MXN', 1190,
   '["invitacion_web","pases_personalizados","panel_novios","export_excel","itinerario_mapas","mesa_regalos","calendario","galeria","musica","menu_rsvp","cola_whatsapp","idiomas_es_en"]', true),
  ('premium',   'Premium',   'MX', 'MXN', 1990,
   '["invitacion_web","pases_personalizados","panel_novios","export_excel","qr_checkin","mesas","diseno_medida","save_the_date","thank_you","recordatorios","musica","cola_whatsapp","idiomas_es_en"]', true)
on conflict (code, country) do update
  set name = excluded.name, currency = excluded.currency, price = excluded.price,
      features = excluded.features, active = excluded.active;

-- Extras: qué paquete ya los trae.
update extras set included_in = '{premium}'            where country = 'MX' and code in ('qr_checkin', 'save_the_date', 'recordatorios');
update extras set included_in = '{con_pases,premium}'  where country = 'MX' and code = 'musica';
update extras set included_in = '{}'                   where country = 'MX' and code in ('envio_por_nosotros', 'idioma_extra', 'galeria_extra', 'cambios_extra', 'dominio_propio');
