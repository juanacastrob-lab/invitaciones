/** Rutas y URLs de las fotos en Supabase Storage. Sin dependencias de servidor. */

export const MEDIA_BUCKET = 'event-media';

export type MediaKind = 'photo' | 'og';
export type MediaExt = 'webp' | 'jpg' | 'png';

/** Nombre aleatorio: la URL es pública pero no adivinable ni enumerable. */
export function mediaPath(eventId: string, ext: MediaExt, random: string): string {
  return `events/${eventId}/${random}.${ext}`;
}

export function publicMediaUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

export function extFromMime(mime: string): MediaExt | null {
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  return null;
}
