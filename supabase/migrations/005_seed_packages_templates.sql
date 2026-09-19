-- =============================================================================
-- 005_seed_packages_templates.sql — Paquetes y plantillas de mensaje iniciales
--
-- PRECIOS PROVISIONALES. Están aquí para que el sistema tenga con qué
-- arrancar; Juan los cambia desde el admin (o con un update) sin tocar código.
-- Se puede correr las veces que haga falta: actualiza, no duplica.
-- =============================================================================

insert into packages (code, name, country, currency, price, features, active) values
  -- México
  ('esencial', 'Esencial', 'MX', 'MXN', 1490, '["invitacion_web","rsvp","panel_novios","idiomas_es_en"]', true),
  ('completo', 'Completo', 'MX', 'MXN', 2490, '["invitacion_web","rsvp","panel_novios","idiomas_es_en","pases_personalizados","cola_whatsapp","galeria","musica","mesa_regalos"]', true),
  ('premium',  'Premium',  'MX', 'MXN', 3990, '["invitacion_web","rsvp","panel_novios","idiomas_es_en","pases_personalizados","cola_whatsapp","galeria","musica","mesa_regalos","envio_por_nosotros","recordatorios","qr_checkin"]', true),
  -- Estados Unidos
  ('esencial', 'Essential', 'US', 'USD', 79,  '["invitacion_web","rsvp","panel_novios","idiomas_es_en"]', true),
  ('completo', 'Complete',  'US', 'USD', 129, '["invitacion_web","rsvp","panel_novios","idiomas_es_en","pases_personalizados","cola_whatsapp","galeria","musica","mesa_regalos"]', true),
  ('premium',  'Premium',   'US', 'USD', 199, '["invitacion_web","rsvp","panel_novios","idiomas_es_en","pases_personalizados","cola_whatsapp","galeria","musica","mesa_regalos","envio_por_nosotros","recordatorios","qr_checkin"]', true),
  -- Canadá
  ('esencial', 'Essential', 'CA', 'CAD', 99,  '["invitacion_web","rsvp","panel_novios","idiomas_es_en"]', true),
  ('completo', 'Complete',  'CA', 'CAD', 169, '["invitacion_web","rsvp","panel_novios","idiomas_es_en","pases_personalizados","cola_whatsapp","galeria","musica","mesa_regalos"]', true),
  ('premium',  'Premium',   'CA', 'CAD', 259, '["invitacion_web","rsvp","panel_novios","idiomas_es_en","pases_personalizados","cola_whatsapp","galeria","musica","mesa_regalos","envio_por_nosotros","recordatorios","qr_checkin"]', true)
on conflict (code, country) do update
  set name = excluded.name,
      currency = excluded.currency,
      price = excluded.price,
      features = excluded.features,
      active = excluded.active;

-- Plantillas para la cola de WhatsApp. Variables: {nombre} {pareja} {fecha} {link} {pases}
insert into message_templates (key, language, body) values
  ('invite', 'es',
   E'Hola {nombre} 👋\n\n{pareja} te invitan a su boda el {fecha}.\n\nAquí está tu invitación personal ({pases}):\n{link}\n\nAhí puedes ver todos los detalles y confirmar tu asistencia. ¡Esperamos verte!'),
  ('invite', 'en',
   E'Hi {nombre} 👋\n\n{pareja} are getting married on {fecha} and would love to have you there.\n\nHere is your personal invitation ({pases}):\n{link}\n\nYou can see all the details and RSVP right there. Hope to see you!'),

  ('reminder_pending', 'es',
   E'Hola {nombre}, ¿cómo estás?\n\nTe escribimos de parte de {pareja}: todavía no nos llega tu confirmación para la boda del {fecha}.\n\nNos ayudaría mucho saber si vienes. Es un minuto:\n{link}\n\n¡Gracias!'),
  ('reminder_pending', 'en',
   E'Hi {nombre}, hope you''re well!\n\nA quick note on behalf of {pareja}: we haven''t received your RSVP for the wedding on {fecha} yet.\n\nIt would help a lot to know if you''re coming. Takes a minute:\n{link}\n\nThank you!'),

  ('reminder_opened', 'es',
   E'Hola {nombre} 🙂\n\nVimos que abriste la invitación de {pareja} pero no alcanzaste a confirmar.\n\nCuando puedas, aquí está tu link:\n{link}\n\n¡Nos encantaría contar contigo el {fecha}!'),
  ('reminder_opened', 'en',
   E'Hi {nombre} 🙂\n\nWe saw you opened {pareja}''s invitation but didn''t get to RSVP.\n\nWhenever you can, here is your link:\n{link}\n\nWe''d love to have you there on {fecha}!')
on conflict (key, language) do update
  set body = excluded.body;
