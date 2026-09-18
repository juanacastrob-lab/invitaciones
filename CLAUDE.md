# Plataforma de invitaciones digitales

Nombre comercial: POR DEFINIR. Usa `APP_NAME` en config, nunca lo hardcodees.
Dueño: Juan. Respóndeme siempre en español informal, directo y conciso.

## Qué es

Plataforma de invitaciones digitales web para bodas (después XV años, bautizos, baby showers) en **México, Estados Unidos y Canadá**, sobre la misma base de código.

Modelo inicial: **servicio hecho para ti**. El cliente llena sus datos en un formulario, mi equipo (una administrativa con un celular de WhatsApp) arma la invitación desde una plantilla, el cliente revisa y aprueba. Un editor self-service para clientes viene después.

Meta operativa: producir una invitación en menos de 1 hora, sin que la operación dependa de Juan.

Referencias de competencia:
- bridesandgrooms.com.mx: MX, hecho para ti, pases personalizados por invitado, panel de invitados, mensajes de WhatsApp.
- lovebird.com: US, self-service, save the date, thank you cards, RSVP con selección de menú y encuestas, mensajes a invitados.

## Stack (no cambiar sin preguntarme)

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase: Postgres, Auth, Storage, RLS. **Proyecto nuevo**, separado de mis otros sistemas.
- next-intl para idiomas: `es` y `en` desde el día 1; `fr` después (Quebec)
- Zod para validar todo input
- GitHub + Netlify (Next.js con el runtime oficial de Netlify)
- Después: Resend (email), Stripe (pagos MX/US/CA), WhatsApp Cloud API

> Mis herramientas internas son HTML suelto con credenciales embebidas y passwords en texto plano. **Este proyecto NO sigue ese patrón**: es público y maneja datos de invitados de 3 países.

## Seguridad (obligatorio)

- RLS activado en **todas** las tablas desde la primera migración.
- La service role key solo en servidor (`.env.local` / variables de entorno de Netlify). Nunca en el cliente ni en git. `.env*` en `.gitignore`.
- Supabase Auth para staff y clientes (magic link u OTP por email). Nada de tablas de usuarios propias ni passwords en texto plano.
- Los invitados NO tienen cuenta: entran con un token aleatorio largo y no secuencial en su link.
- La invitación pública solo expone los datos de ese evento y de ese invitado. Nunca la lista de invitados.
- RSVP vía server action o RPC con validación y rate limit.
- Aviso de privacidad (MX) / Privacy policy (US/CA) en el sitio; checkbox de consentimiento en formularios que capturan datos.
- Esquema solo por migraciones versionadas en `supabase/migrations`. Nada de cambios manuales en el dashboard.

## Roles

- `admin` (Juan): todo.
- `staff` (administrativa): leads, pedidos, eventos, invitados, envíos. No puede borrar eventos ni cambiar precios o configuración.
- `client` (novios): solo sus eventos. Ve invitados y confirmaciones, exporta, edita su lista antes de publicar.
- `guest`: sin cuenta, acceso por token.

## Módulos

### 1. Invitación pública
- `/i/[slug]` (general) y `/i/[slug]/[token]` (personalizada por invitado).
- La personalizada muestra el nombre y los pases ("Familia López · 4 pases") y limita el RSVP a esos pases.
- Secciones activables por evento: portada, cuenta regresiva, nuestra historia, itinerario con varios actos (civil, religiosa, recepción; cada uno con fecha, hora, lugar y botones de Google Maps / Waze / Apple Maps), código de vestimenta, "no niños", mesa de regalos (links + datos bancarios / sobres), hospedaje, galería, música de fondo, FAQ, RSVP.
- Bilingüe: el evento puede estar en `es`, `en` o ambos con switch.
- Mobile-first, carga rápida en 4G, animaciones sutiles.
- **Open Graph por evento** (título, descripción e imagen con foto y nombres) para que el preview en WhatsApp e iMessage se vea bien. Es crítico para vender.
- Registrar la primera apertura del link personal (`opened_at`).
- Botón "agregar al calendario" (.ics y Google Calendar).
- Zona horaria por evento.

### 2. RSVP
- Asiste / no asiste, cuántos (≤ pases), nombres de acompañantes.
- Opcionales por evento: selección de menú, restricciones alimentarias, canción sugerida, mensaje a los novios.
- Fecha límite configurable. El invitado puede modificar su respuesta hasta la fecha límite.
- Guardar historial de respuestas; la última es la que cuenta.

### 3. Panel de novios (`/panel`)
- KPIs: invitados, pases totales, personas confirmadas, no asisten, pendientes, abrieron sin confirmar.
- Lista filtrable y exportable a Excel/CSV.
- Mensajes recibidos de los invitados.

### 4. Panel admin (`/admin`)
- **Eventos**: crear desde plantilla, duplicar, estados `borrador → en_revision → publicado → finalizado → archivado`.
- **Invitados**: alta manual, importar Excel/CSV (con plantilla descargable), editar pases, generar tokens.
- **Cola de envío por WhatsApp** (para el celular de la administrativa): lista de invitados con botón que abre `https://wa.me/<tel>?text=<mensaje>` con mensaje prellenado y su link personal; marcar como enviado; rondas de recordatorio a pendientes y a quienes abrieron sin confirmar. Plantillas de mensaje por idioma. Esto también se vende como servicio extra.
- **Leads / CRM** (Fase 2): nombre, teléfono, país, idioma, fuente y campaña (UTM, anuncio de Facebook/Instagram), tipo y fecha de evento, etapa (`nuevo → contactado → cotizado → anticipo → en_produccion → entregado → perdido`), próximo seguimiento, notas.
- **Pedidos y pagos** (Fase 2): paquete, precio, moneda, anticipo, saldo, método, comprobante.
- **Formulario de datos del cliente** (Fase 2): link que se manda tras el anticipo para que el cliente llene nombres, fechas, lugares, fotos, colores, regalos y suba su lista de invitados. Crea el borrador del evento automáticamente.
- **Bitácora**: quién hizo qué y cuándo.

### 5. Plantillas
- Cada plantilla = componente React + config (colores, tipografías, secciones soportadas).
- El contenido del evento vive en `events.content` (JSONB validado con Zod), así la misma data sirve para cualquier plantilla.
- Empezar con **1 plantilla muy bien hecha**; luego 3–5.

### 6. Check-in (Fase 2)
- Pase con QR al confirmar.
- `/checkin/[evento]` para el día del evento: escanear QR con la cámara del celular, ver nombre y pases, marcar llegada, contador en vivo.

## Modelo de datos inicial (ajústalo si hace falta, explícame por qué)

- `profiles` (user_id, role, name, phone)
- `packages` (code, name, country, currency, price, features) — precios configurables, nunca hardcodeados
- `events` (id, order_id nullable hasta Fase 2, slug, type, template, languages[], default_language, timezone, status, content jsonb, rsvp_deadline, og_image_url, created_by)
- `event_members` (event_id, user_id) — qué clientes ven qué evento
- `guests` (id, event_id, display_name, passes, phone, email, language, token, group_tag, table_no, status [pending|confirmed|declined], confirmed_count, sent_at, opened_at, responded_at, reminder_count)
- `rsvp_responses` (guest_id, attending, count, attendee_names[], menu_choices, dietary, song, message, created_at)
- `message_templates` (key, language, body)
- `activity_log` (actor, entity, entity_id, action, data, created_at)
- Fase 2: `leads`, `orders`, `payments`

## Multi-país

- Monedas MXN, USD, CAD; precios por país en `packages`.
- Teléfonos en formato E.164 (+52, +1), validados con libphonenumber.
- Fechas y horas formateadas según el idioma del evento.
- Mesa de regalos como links configurables: MX (Liverpool, Amazon, datos bancarios, sobres); US/CA (Amazon, Zola, honeymoon fund, links de pago).

## Fases

**Fase 1 — MVP para vender**
Esquema + RLS, auth admin/staff, plantilla #1, invitación pública con pases por invitado, RSVP, Open Graph, admin de eventos e invitados con import de Excel, cola de envío por WhatsApp, panel de novios, deploy. Incluye un **evento demo** en es y en para usar en los anuncios.

**Fase 2**
Leads/CRM, landing con formulario (captura UTM), pedidos y pagos, formulario de datos del cliente, QR + check-in, mesas, recordatorios por email.

**Fase 3**
Stripe, WhatsApp Cloud API (recordatorios automáticos), dominio propio por evento, save the date y thank you cards, fotos de invitados el día del evento, más plantillas, XV años y otros eventos, portal para wedding planners con comisión, francés.

## Forma de trabajar

- Cambios chicos e incrementales; cada paso debe quedar funcionando antes del siguiente.
- Antes de algo grande: plan corto y esperar mi OK.
- Probar en viewport de celular (390px) antes de dar algo por terminado.
- No hacer deploy a producción en cada cambio; juntar cambios.

## Netlify: cuidar créditos (ya me quedé sin créditos una vez)

- Cada deploy a producción cuesta créditos; los deploy previews y branch deploys son gratis.
- Se trabaja en la rama `dev` (branch deploy para probar). `main` = producción, y solo se hace merge a `main` cuando yo lo pida, juntando varios cambios.
- Fotos optimizadas (WebP, tamaño adecuado) y servidas desde Supabase Storage, no desde Netlify, para no gastar ancho de banda.
- La música de fondo se descarga solo cuando el invitado toca play, nunca en la carga inicial.
- Evitar funciones del servidor innecesarias: lo que pueda ser estático o cacheado, que lo sea.
- Al terminar cada tarea: resumen de 3–5 líneas de qué cambió y qué sigue.
- Si algo del negocio no está claro, pregúntame en vez de suponer.
