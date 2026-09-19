'use server';

import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { MEDIA_BUCKET } from '@/lib/media';

/** Borrar una foto del álbum: la RLS solo deja a miembros y equipo; el archivo se borra con service role. */
export async function deleteAlbumPhoto(eventId: string, photoId: string): Promise<{ ok: boolean; error?: string }> {
  await requireRole('admin', 'staff', 'client');
  const ids = z.object({ eventId: z.string().uuid(), photoId: z.string().uuid() }).safeParse({ eventId, photoId });
  if (!ids.success) return { ok: false, error: 'invalid' };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('event_photos').delete().eq('id', ids.data.photoId).eq('event_id', ids.data.eventId).select('path').maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'not_found' };
  await supabaseAdmin().storage.from(MEDIA_BUCKET).remove([data.path]).catch(() => undefined);
  return { ok: true };
}
