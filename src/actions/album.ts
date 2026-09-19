'use server';

import { createHash, randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerEnv } from '@/lib/env';
import { MEDIA_BUCKET, publicMediaUrl, type MediaExt } from '@/lib/media';

/** Huella del visitante para el rate limit (hash, nunca la IP). */
async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get('x-nf-client-connection-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'sin-ip';
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

const slugSchema = z.string().regex(/^[a-z0-9-]{3,60}$/);

/**
 * URL firmada para que un invitado (sin cuenta) suba una foto al álbum.
 * Solo si el álbum del evento está abierto. La foto se registra después
 * con registerAlbumPhoto: la base valida la ruta y el rate limit.
 */
export async function createAlbumUploadUrl(slug: string, ext: string): Promise<{ ok: true; path: string; token: string; publicUrl: string } | { ok: false; error: string }> {
  const s = slugSchema.safeParse(slug);
  if (!s.success || !['webp', 'jpg', 'png'].includes(ext)) return { ok: false, error: 'invalid' };
  const admin = supabaseAdmin();
  const { data: allowed } = await admin.rpc('rate_limit_check', { p_bucket: `album-url:${await clientKey()}`, p_max: 60, p_window: '1 hour' });
  if (allowed === false) return { ok: false, error: 'too_many_attempts' };
  const { data: album } = await admin.rpc('rpc_album_list', { p_slug: s.data });
  if (!album) return { ok: false, error: 'closed' };
  const eventId = (album as { event_id: string }).event_id;
  const path = `events/${eventId}/album/${randomBytes(9).toString('base64url')}.${ext as MediaExt}`;
  const { data, error } = await admin.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: 'storage' };
  return { ok: true, path, token: data.token, publicUrl: publicMediaUrl(getServerEnv().NEXT_PUBLIC_SUPABASE_URL, path) };
}

export async function registerAlbumPhoto(slug: string, path: string, uploader: string, caption: string): Promise<{ ok: boolean; error?: string }> {
  const s = slugSchema.safeParse(slug);
  if (!s.success) return { ok: false, error: 'invalid' };
  const { data, error } = await supabaseAdmin().rpc('rpc_album_add', {
    p_slug: s.data, p_path: path, p_uploader: uploader.slice(0, 60), p_caption: caption.slice(0, 200), p_client_key: await clientKey(),
  });
  if (error) return { ok: false, error: error.message };
  const r = data as { ok: boolean; error?: string };
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}
