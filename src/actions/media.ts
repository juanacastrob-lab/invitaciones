'use server';

import { randomBytes } from 'node:crypto';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerEnv } from '@/lib/env';
import { MEDIA_BUCKET, mediaPath, publicMediaUrl, type MediaExt } from '@/lib/media';
import type { ActionResult } from '@/schemas/admin';

const EXTS: MediaExt[] = ['webp', 'jpg', 'png'];

/**
 * URL firmada para subir una foto directo del navegador a Storage. El
 * archivo no pasa por Netlify (ancho de banda) y la service role key se
 * queda en el servidor. Solo se firma si quien pide puede ver el evento.
 */
export async function createUploadUrl(eventId: string, ext: string): Promise<ActionResult<{ path: string; token: string; publicUrl: string }>> {
  await requireRole('admin', 'staff', 'client');
  if (!EXTS.includes(ext as MediaExt)) return { ok: false, error: 'Formato no permitido.' };

  const supabase = await supabaseServer();
  const { data: event } = await supabase.from('events').select('id').eq('id', eventId).maybeSingle();
  if (!event) return { ok: false, error: 'Sin acceso a este evento.' };

  const path = mediaPath(eventId, ext as MediaExt, randomBytes(9).toString('base64url'));
  const { data, error } = await supabaseAdmin().storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: error?.message ?? 'No se pudo preparar la subida.' };

  return { ok: true, data: { path, token: data.token, publicUrl: publicMediaUrl(getServerEnv().NEXT_PUBLIC_SUPABASE_URL, path) } };
}
