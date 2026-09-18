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

## Ramas y donde ver cada cosa

- `main` = produccion: https://holaboda.mx. Solo se hace merge cuando Juan lo pide.
- `dev` = rama de trabajo: https://dev--holaboda.netlify.app. Netlify la
  reconstruye sola con cada push (branch deploy, no gasta deploys de produccion).

Evento demo: `/i/ana-y-luis` (link general) y `/i/ana-y-luis/<token>` (personal).
Agrega `?lang=en` para verlo en ingles.
