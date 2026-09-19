# Plataforma de invitaciones digitales

Invitaciones web para bodas (despues XV anos, bautizos, baby showers) en Mexico,
Estados Unidos y Canada. Ver `CLAUDE.md` para el contexto completo del proyecto.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- next-intl (`es` / `en`), Zod para validar todo input
- Supabase: Postgres + Auth + Storage, con RLS en todas las tablas
- Deploy en Netlify

## Como se trabaja

No hace falta instalar nada en una computadora. Todo pasa en el navegador:

- El codigo vive en GitHub.
- El sitio se publica solo en Netlify cada vez que se sube codigo.
- La base de datos se cambia pegando las migraciones de `supabase/migrations/`
  en el SQL Editor de Supabase, en orden.

## Variables de entorno

Los nombres estan en `.env.example`. Los valores se ponen en Netlify
(Site configuration > Environment variables). `SUPABASE_SERVICE_ROLE_KEY`
es privada: solo servidor, nunca en git.

Correo a invitados (opcional): `RESEND_API_KEY` (se crea en resend.com) y
`EMAIL_FROM` (un remitente de un dominio verificado en Resend, p. ej.
`Hola Boda <hola@holaboda.mx>`; Resend pide agregar unos registros DNS del
dominio, que van en Netlify DNS). Sin esas dos variables, el boton de correo
en la cola de envio aparece apagado y todo lo demas sigue igual.

Recordatorios automaticos: ademas del correo, `CRON_SECRET` (un texto largo al
azar). Una funcion programada de Netlify (`netlify/functions/reminders-cron.mts`,
cada 15 minutos) llama a `/api/cron/reminders` con ese secreto, y la app manda
el recordatorio a los pendientes con correo de los eventos que lo tengan
activado, en los "dias antes" configurados en Datos del evento. El mismo proceso
manda el "ya casi" (hora y lugar) en las horas antes del evento que se pongan en
Datos, a confirmados y pendientes.

WhatsApp Cloud API (Meta), opcional: `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_ID`. Con
eso, el "ya casi" y los recordatorios salen por WhatsApp a quien tenga telefono
(si no, por correo). Meta exige plantillas aprobadas: hay que crear en el
Business Manager una plantilla por cada clave de `message_templates` que se
quiera mandar (`event_soon`, `reminder_pending`...), en es_MX y en_US, con
cuatro variables en este orden: nombre, pareja, fecha, link. Mientras no haya
Cloud API, el envio masivo es a mano desde la cola con el "modo rapido", con
calma (20-30 por hora) para que WhatsApp no bloquee el numero.

App instalable: en el celular, abrir holaboda.mx/admin y "Agregar a pantalla de
inicio". Abre a pantalla completa con barra inferior; sirve igual para el
panel de los novios.

## Ramas y donde ver cada cosa

- `main` = produccion: https://holaboda.mx. Solo se hace merge cuando Juan lo pide.
- `dev` = rama de trabajo: https://dev--holaboda.netlify.app. Netlify la
  reconstruye sola con cada push (branch deploy, no gasta deploys de produccion).

Evento demo: `/i/ana-y-luis` (link general) y `/i/ana-y-luis/<token>` (personal).
Agrega `?lang=en` para verlo en ingles.
