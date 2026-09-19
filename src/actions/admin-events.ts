'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { eventBasics, eventStatusInput, type ActionResult } from '@/schemas/admin';
import { eventContent, type EventContent } from '@/schemas/event-content';
import { templateContent } from '@/lib/admin/template';
import { NEXT_STATUS, type EventStatus } from '@/lib/admin/labels';

function firstIssue(e: { issues: { path: PropertyKey[]; message: string }[] }): { error: string; field?: string } {
  const i = e.issues[0];
  return { error: i?.message ?? 'Datos inválidos.', field: i?.path.map(String).join('.') };
}

export async function createEvent(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await requireRole('admin', 'staff');
  const parsed = eventBasics.safeParse(raw);
  if (!parsed.success) return { ok: false, ...firstIssue(parsed.error) };
  const b = parsed.data;

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('events')
    .insert({
      slug: b.slug,
      type: b.type,
      package_code: b.packageCode || null,
      template: b.template,
      timezone: b.timezone,
      country: b.country,
      languages: b.languages,
      default_language: b.defaultLanguage,
      rsvp_deadline: b.rsvpDeadline ? `${b.rsvpDeadline}T23:59:59` : null,
      allow_public_rsvp: b.allowPublicRsvp,
      show_private_gifts: b.showPrivateGifts,
      checkin_enabled: b.checkinEnabled,
      auto_reminders: b.autoReminders,
      reminder_days: b.reminderDays,
      save_the_date_enabled: b.saveTheDateEnabled,
      event_reminder_hours: b.eventReminderHours,
      content: templateContent({ partnerA: b.partnerA, partnerB: b.partnerB || undefined, startsAt: b.startsAt, type: b.type }),
      created_by: me.userId,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Ese slug ya está en uso.', field: 'slug' };
    return { ok: false, error: error.message };
  }

  await supabase.rpc('log_activity', { p_entity: 'event', p_entity_id: data.id, p_action: 'create', p_data: { slug: b.slug } });
  redirect(`/admin/events/${data.id}`);
}

export async function updateEventBasics(id: string, raw: unknown): Promise<ActionResult> {
  await requireRole('admin', 'staff');
  const parsed = eventBasics.safeParse(raw);
  if (!parsed.success) return { ok: false, ...firstIssue(parsed.error) };
  const b = parsed.data;

  const supabase = await supabaseServer();
  const { data: current } = await supabase.from('events').select('content').eq('id', id).single();
  if (!current) return { ok: false, error: 'Evento no encontrado.' };

  const content = { ...(current.content as EventContent), couple: { partnerA: b.partnerA, partnerB: b.partnerB || undefined }, startsAt: b.startsAt };

  const { error } = await supabase
    .from('events')
    .update({
      slug: b.slug,
      type: b.type,
      package_code: b.packageCode || null,
      template: b.template,
      timezone: b.timezone,
      country: b.country,
      languages: b.languages,
      default_language: b.defaultLanguage,
      rsvp_deadline: b.rsvpDeadline ? `${b.rsvpDeadline}T23:59:59` : null,
      allow_public_rsvp: b.allowPublicRsvp,
      show_private_gifts: b.showPrivateGifts,
      checkin_enabled: b.checkinEnabled,
      auto_reminders: b.autoReminders,
      reminder_days: b.reminderDays,
      save_the_date_enabled: b.saveTheDateEnabled,
      event_reminder_hours: b.eventReminderHours,
      content,
    })
    .eq('id', id);

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Ese slug ya está en uso.', field: 'slug' };
    return { ok: false, error: error.message };
  }

  await supabase.rpc('log_activity', { p_entity: 'event', p_entity_id: id, p_action: 'update_basics' });
  revalidatePath(`/admin/events/${id}`);
  return { ok: true, message: 'Guardado.' };
}

/** El JSON completo del contenido, validado con el mismo Zod que usa la invitación. */
export async function updateEventContent(id: string, json: string): Promise<ActionResult> {
  await requireRole('admin', 'staff');
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return { ok: false, error: 'El JSON no es válido (revisa comas y llaves).' };
  }
  const parsed = eventContent.safeParse(value);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `${i.path.join('.')}: ${i.message}` };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.from('events').update({ content: parsed.data }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  await supabase.rpc('log_activity', { p_entity: 'event', p_entity_id: id, p_action: 'update_content' });
  revalidatePath(`/admin/events/${id}`);
  return { ok: true, message: 'Contenido guardado.' };
}

export async function setEventStatus(id: string, raw: unknown): Promise<ActionResult> {
  await requireRole('admin', 'staff');
  const parsed = eventStatusInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Estado inválido.' };
  const next = parsed.data;

  const supabase = await supabaseServer();
  const { data: current } = await supabase.from('events').select('status').eq('id', id).single();
  if (!current) return { ok: false, error: 'Evento no encontrado.' };
  if (!NEXT_STATUS[current.status as EventStatus].includes(next)) {
    return { ok: false, error: `No se puede pasar de ${current.status} a ${next}.` };
  }

  const { error } = await supabase.from('events').update({ status: next }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  await supabase.rpc('log_activity', { p_entity: 'event', p_entity_id: id, p_action: 'status', p_data: { from: current.status, to: next } });
  revalidatePath(`/admin/events/${id}`);
  revalidatePath('/admin/events');
  return { ok: true, message: `Ahora está en ${next}.` };
}

export async function duplicateEvent(id: string, newSlug: string): Promise<ActionResult<{ id: string }>> {
  const me = await requireRole('admin', 'staff');
  const slug = eventBasics.shape.slug.safeParse(newSlug);
  if (!slug.success) return { ok: false, error: slug.error.issues[0].message, field: 'slug' };

  const supabase = await supabaseServer();
  const { data: src } = await supabase
    .from('events')
    .select('timezone, country, languages, default_language, content, allow_public_rsvp, show_private_gifts, template, type')
    .eq('id', id)
    .single();
  if (!src) return { ok: false, error: 'Evento no encontrado.' };

  const { data, error } = await supabase
    .from('events')
    .insert({ ...src, slug: slug.data, status: 'borrador', created_by: me.userId })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') return { ok: false, error: 'Ese slug ya está en uso.', field: 'slug' };
    return { ok: false, error: error.message };
  }

  await supabase.rpc('log_activity', { p_entity: 'event', p_entity_id: data.id, p_action: 'duplicate', p_data: { from: id } });
  redirect(`/admin/events/${data.id}`);
}

/** Solo admin: la RLS lo bloquea para staff, pero mejor ni intentarlo. */
export async function deleteEvent(id: string): Promise<ActionResult> {
  await requireRole('admin');
  const supabase = await supabaseServer();
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  redirect('/admin/events');
}
