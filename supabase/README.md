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

Se corren contra un Postgres desechable (no contra Supabase), aplicando primero
`tests/_supabase_shim.sql`, que imita lo mínimo de Supabase (`auth.users`,
`auth.uid()` y los roles `anon` / `authenticated` / `service_role`).
