# Base de datos

## Cómo aplicar una migración

No hace falta instalar nada. En el navegador:

1. Entra a Supabase → tu proyecto → **SQL Editor** → *New query*.
2. Abre el archivo de `migrations/` que toque, cópialo completo y pégalo.
3. **Run**.

Las migraciones se aplican **en orden de número** y **una sola vez**. Si corres
dos veces la misma, va a fallar diciendo que las tablas ya existen — eso es
normal y no rompe nada.

## Migraciones

| Archivo | Qué hace |
|---|---|
| `001_init.sql` | Tablas, tipos, índices y RLS de toda la Fase 1 |
| `002_demo_event.sql` | Evento demo (es/en) con invitados de prueba. Generado, no editar a mano |
| `003_guest_access.sql` | Funciones por las que entra un invitado sin cuenta, y el rate limit |
| `004_rsvp.sql` | Confirmacion de asistencia, con todas las validaciones del lado de la base |
| `005_seed_packages_templates.sql` | Paquetes con precios PROVISIONALES por pais y plantillas de WhatsApp es/en. Se puede repetir |
| `006_packages_mx.sql` | Los 4 paquetes de Mexico con los precios de Juan; US y CA quedan inactivos hasta tener precio |
| `007_demo_rename.sql` | Renombra el demo a juan-y-ana y refresca su contenido sin cambiar tokens. Generado |
| `008_leads.sql` | Prospectos que llegan desde la landing, con RLS |
| `009_admin.sql` | Pais del evento, bitacora (log_activity) y la vista event_stats para el admin |
| `010_event_members.sql` | Acceso de los novios a su evento por correo, con enlace automatico al crear cuenta |
| `011_store.sql` | Tienda: extras (precios PROVISIONALES), pedidos, pagos y marcar transferencias pagadas |
| `012_event_types.sql` | Tipos de evento nuevos (graduacion, cumpleanos, otro). Va aparte por como funcionan los enums |
| `013_tables.sql` | Mesas: tabla event_tables, guests.table_id, rpc_assign_table (novios pueden acomodar aun publicado) y vista table_stats. Tambien pone `security_invoker` en event_stats y table_stats para que las vistas respeten RLS |
| `014_content_editor.sql` | Tipos de evento primera_comunion y confirmacion, y rpc_update_event_content para que novios y planner guarden el contenido desde el panel (solo en borrador o en revision) |
| `015_storage.sql` | Bucket `event-media` (publico de lectura, 6 MB, webp/jpg/png) para las fotos que se suben desde el editor. Se puede repetir |
| `016_team_pricing.sql` | Equipo por invitación (team_invites, rpc_invite_staff, rpc_set_role con candados), correo en profiles y paquete por evento (events.package_code) |
| `017_approve.sql` | rpc_approve_event: los novios aprueban desde el panel y la invitacion pasa de en_revision a publicado |
| `018_checkin.sql` | Pase con QR y check-in: events.checkin_enabled, guests.checked_in_at/count, rpc_checkin, rpc_get_invitation con la bandera y event_stats con llegadas |
| `019_auto_reminders.sql` | Recordatorios automaticos: events.auto_reminders / reminder_days y guests.auto_reminder_milestone. Se puede repetir |
| `020_save_the_date.sql` | Save the date publico (events.save_the_date_enabled, rpc_get_save_the_date) y plantillas de mensaje save_the_date / thank_you |

`002` se genera desde `src/demo/demo-event.ts` con `npm run build:demo-seed`, así
el contenido de la base y el que espera la app nunca se separan. Se puede correr
las veces que haga falta: actualiza el evento y no duplica invitados.

## Después de la primera migración

Entra una vez a la app con tu correo (magic link) para que se te cree el perfil,
y luego córrele esto en el SQL Editor para volverte admin:

```sql
update profiles set role = 'admin'
where user_id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
```

## Pruebas

`tests/001_rls_test.sql` comprueba que la seguridad hace lo que promete: que un
invitado sin cuenta no ve nada, que unos novios solo ven su evento, que la
administrativa no puede borrar eventos y que nadie se puede autoascender a
admin.

`tests/003_guest_access_test.sql` comprueba el acceso por token: que un token
invalido o de otro evento no filtra nada, que un borrador no se asoma sin su
llave de revision, que los datos bancarios solo salen en el link personal, y
que la respuesta nunca incluye la lista de invitados.

`tests/004_rsvp_test.sql` comprueba la confirmacion: que nadie confirme mas
personas que pases, que "no asisto" no cuele acompanantes, que el menu solo
acepte platillos del evento, que pasada la fecha limite se cierre, y que
cambiar de opinion conserve el historial completo.

`tests/013_tables_test.sql` (requiere 001..013) comprueba las mesas: que los
novios puedan asignar mesa aunque el evento ya este publicado pero no editar
otros datos del invitado, que no se pueda usar una mesa de otro evento, y que
las vistas `event_stats` y `table_stats` solo muestren los eventos de cada quien.

`tests/014_content_test.sql` (requiere 001..014) comprueba que los novios
solo guarden contenido en borrador o en revision, que un ajeno no pueda, que el
equipo siempre pueda y que quede en la bitacora.

`tests/016_team_test.sql` (requiere 001..016) comprueba los candados del
equipo: solo el admin invita o cambia roles, nadie se vuelve admin desde la
app, el staff no puede cambiar precios, y quien entra con un correo invitado
queda como staff.

`tests/017_approve_test.sql` y `tests/018_checkin_test.sql` cubren la
aprobacion desde el panel y el check-in (acceso, tope en pases, automatico,
deshacer).

Se corren contra un Postgres desechable (no contra Supabase), aplicando primero
`tests/_supabase_shim.sql`, que imita lo mínimo de Supabase (`auth.users`,
`auth.uid()` y los roles `anon` / `authenticated` / `service_role`).
