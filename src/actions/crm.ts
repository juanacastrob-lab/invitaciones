'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { normalizePhone } from '@/schemas/lead';
import { leadCreate, leadUpdate, activityCreate } from '@/schemas/crm';
import type { ActionResult } from '@/schemas/admin';

function firstIssue(e: { issues: { message: string }[] }): string {
  return e.issues[0]?.message ?? 'Datos inválidos.';
}

/** Alta a mano: alguien escribió por Instagram, llamó, o lo trajo un planner. */
export async function createLeadManual(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await requireRole('admin', 'staff');
  const parsed = leadCreate.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const i = parsed.data;
  const phone = normalizePhone(i.phone, i.country);
  if (!phone) return { ok: false, error: 'Teléfono inválido para ese país.' };

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('leads')
    .insert({
      partner_a: i.partnerA, partner_b: i.partnerB || null, phone, email: i.email || null, country: i.country, language: i.language,
      event_type: i.eventType, event_date: i.eventDate || null, city: i.city || null, guests_estimate: i.guestsEstimate || null,
      source: i.source, notes: i.notes || null, consent_at: new Date().toISOString(), assigned_to: me.userId,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: error?.code === '23505' ? 'Ya existe un prospecto con esos datos.' : (error?.message ?? 'No se pudo guardar.') };
  revalidatePath('/admin/leads');
  return { ok: true, data: { id: data.id }, message: 'Prospecto guardado.' };
}

export async function updateLead(leadId: string, raw: unknown): Promise<ActionResult> {
  await requireRole('admin', 'staff');
  const parsed = leadUpdate.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const u = parsed.data;
  const patch: Record<string, unknown> = {};
  if (u.stage !== undefined) patch.stage = u.stage;
  if (u.nextFollowUp !== undefined) patch.next_follow_up = u.nextFollowUp;
  if (u.assignedTo !== undefined) patch.assigned_to = u.assignedTo;
  if (u.value !== undefined) patch.value = u.value;
  if (u.packageCode !== undefined) patch.package_code = u.packageCode || null;
  if (u.lostReason !== undefined) patch.lost_reason = u.lostReason;
  if (u.notes !== undefined) patch.notes = u.notes || null;
  if (u.eventDate !== undefined) patch.event_date = u.eventDate;
  if (u.city !== undefined) patch.city = u.city || null;
  if (u.email !== undefined) patch.email = u.email || null;
  if (u.partnerA !== undefined) patch.partner_a = u.partnerA;
  if (u.partnerB !== undefined) patch.partner_b = u.partnerB || null;
  if (u.guestsEstimate !== undefined) patch.guests_estimate = u.guestsEstimate;
  if (u.stage === 'perdido' && u.lostReason === undefined) patch.lost_reason = patch.lost_reason ?? 'otro';
  if (!Object.keys(patch).length) return { ok: true };

  const supabase = await supabaseServer();
  const { error } = await supabase.from('leads').update(patch).eq('id', leadId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath('/admin');
  return { ok: true, message: 'Guardado.' };
}

/** Nota, llamada, WhatsApp, correo o tarea. Una tarea con fecha se vuelve el próximo seguimiento. */
export async function addActivity(leadId: string, raw: unknown): Promise<ActionResult> {
  const me = await requireRole('admin', 'staff');
  const parsed = activityCreate.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const a = parsed.data;
  const supabase = await supabaseServer();
  const dueAt = a.kind === 'tarea' && a.dueAt ? new Date(a.dueAt.length === 10 ? `${a.dueAt}T09:00` : a.dueAt).toISOString() : null;
  const { error } = await supabase.from('lead_activities').insert({ lead_id: leadId, actor: me.userId, kind: a.kind, body: a.body, due_at: dueAt });
  if (error) return { ok: false, error: error.message };

  const touch: Record<string, unknown> = {};
  if (['llamada', 'whatsapp', 'correo'].includes(a.kind)) touch.last_contact_at = new Date().toISOString();
  if (dueAt) touch.next_follow_up = dueAt.slice(0, 10);
  if (Object.keys(touch).length) await supabase.from('leads').update(touch).eq('id', leadId);

  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath('/admin/leads');
  revalidatePath('/admin');
  return { ok: true, message: 'Guardado.' };
}

export async function completeTask(activityId: string, leadId: string): Promise<ActionResult> {
  await requireRole('admin', 'staff');
  const supabase = await supabaseServer();
  const { error } = await supabase.from('lead_activities').update({ done_at: new Date().toISOString() }).eq('id', activityId);
  if (error) return { ok: false, error: error.message };
  // El próximo seguimiento pasa a la siguiente tarea pendiente, si hay.
  const { data: next } = await supabase.from('lead_activities').select('due_at').eq('lead_id', leadId).is('done_at', null).not('due_at', 'is', null).order('due_at').limit(1).maybeSingle();
  await supabase.from('leads').update({ next_follow_up: next?.due_at ? String(next.due_at).slice(0, 10) : null }).eq('id', leadId);
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath('/admin/leads');
  revalidatePath('/admin');
  return { ok: true };
}

export async function deleteLead(leadId: string): Promise<ActionResult> {
  await requireRole('admin');
  const supabase = await supabaseServer();
  const { error } = await supabase.from('leads').delete().eq('id', leadId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/leads');
  return { ok: true, message: 'Prospecto borrado.' };
}
