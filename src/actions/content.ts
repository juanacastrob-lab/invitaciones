'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { eventContent } from '@/schemas/event-content';
import type { ActionResult } from '@/schemas/admin';

/**
 * Guarda el contenido armado por el editor. Lo valida con el mismo Zod que
 * usa la invitación, y lo escribe por `rpc_update_event_content`, que es la
 * que decide si quien guarda puede (equipo siempre; novios y planner solo en
 * borrador o en revisión).
 */
export async function saveEventContent(eventId: string, raw: unknown): Promise<ActionResult<{ path: string }>> {
  await requireRole('admin', 'staff', 'client');
  const parsed = eventContent.safeParse(raw);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: i.message, field: i.path.map(String).join('.') };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('rpc_update_event_content', { p_event_id: eventId, p_content: parsed.data });
  if (error) return { ok: false, error: error.message };

  const { data: ev } = await supabase.from('events').select('slug').eq('id', eventId).maybeSingle();
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/content`);
  revalidatePath(`/panel/${eventId}`);
  revalidatePath(`/panel/${eventId}/contenido`);
  if (ev?.slug) {
    revalidatePath(`/i/${ev.slug}`, 'layout');
    revalidatePath(`/i/${ev.slug}/opengraph-image`);
  }
  return { ok: true, message: 'saved' };
}
