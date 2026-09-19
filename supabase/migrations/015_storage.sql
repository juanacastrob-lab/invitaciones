-- =============================================================================
-- 015_storage.sql — Bucket de fotos de los eventos
--
-- Las fotos se suben desde el editor ya reducidas (WebP o JPEG) y se sirven
-- directo desde Supabase Storage, no desde Netlify. El bucket es público de
-- lectura: las invitaciones son públicas y las rutas llevan un id aleatorio.
-- Las subidas van por URL firmada que genera el servidor tras revisar acceso,
-- así que ni anon ni authenticated necesitan políticas de escritura.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-media', 'event-media', true, 6291456, '{image/webp,image/jpeg,image/png}')
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
