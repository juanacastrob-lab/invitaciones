'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendWhatsappText, sendWhatsappTemplate, whatsappConfig } from '@/lib/whatsapp/cloud';
import { withinServiceWindow } from '@/lib/whatsapp/inbox';
import { waReply } from '@/schemas/crm';
import type { ActionResult } from '@/schemas/admin';
import type { WaMessageRow } from '@/lib/admin/queries';

/** Contesta desde la bandeja. Se guarda primero (con su estado) y luego se manda, para que nada se pierda. */
export async function replyWhatsapp(raw: unknown): Promise<ActionResult> {
  const me = await requireRole('admin', 'staff');
  const parsed = waReply.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  if (!whatsappConfig()) return { ok: false, error: 'WhatsApp no está conectado todavía (faltan WHATSAPP_TOKEN y WHATSAPP_PHONE_ID en Netlify).' };
  const { conversationId, body } = parsed.data;

  const supabase = await supabaseServer();
  const { data: conv } = await supabase.from('wa_conversations').select('id, phone, last_inbound_at, lead_id').eq('id', conversationId).maybeSingle();
  if (!conv) return { ok: false, error: 'Conversación no encontrada.' };
  if (!withinServiceWindow(conv.last_inbound_at)) {
    return { ok: false, error: 'Pasaron más de 24 h desde su último mensaje: Meta solo deja mandar una plantilla aprobada. Usa "Reabrir con plantilla".' };
  }

  const admin = supabaseAdmin();
  const { data: msg } = await admin.from('wa_messages').insert({ conversation_id: conv.id, direction: 'out', body, status: 'sent', sent_by: me.userId }).select('id').single();
  const r = await sendWhatsappText({ to: conv.phone, body });
  if (msg) await admin.from('wa_messages').update(r.ok ? { wa_id: r.id || null } : { status: 'failed', error: r.error }).eq('id', msg.id);
  await admin.from('wa_conversations').update({ last_message_at: new Date().toISOString(), unread: 0 }).eq('id', conv.id);
  if (conv.lead_id) await admin.from('leads').update({ last_contact_at: new Date().toISOString() }).eq('id', conv.lead_id);
  revalidatePath(`/admin/inbox/${conv.id}`);
  revalidatePath('/admin/inbox');
  return r.ok ? { ok: true } : { ok: false, error: `Meta no lo aceptó: ${r.error}` };
}

/**
 * Fuera de la ventana de 24 h: manda la plantilla de seguimiento aprobada en
 * Meta (WHATSAPP_FOLLOWUP_TEMPLATE, por defecto "seguimiento") con el nombre.
 */
export async function reopenWithTemplate(conversationId: string): Promise<ActionResult> {
  const me = await requireRole('admin', 'staff');
  if (!whatsappConfig()) return { ok: false, error: 'WhatsApp no está conectado todavía.' };
  const supabase = await supabaseServer();
  const { data: conv } = await supabase.from('wa_conversations').select('id, phone, name, lead_id, leads(partner_a, language)').eq('id', conversationId).maybeSingle();
  if (!conv) return { ok: false, error: 'Conversación no encontrada.' };
  const lead = (Array.isArray(conv.leads) ? conv.leads[0] : conv.leads) as { partner_a: string; language: string } | null;
  const name = lead?.partner_a ?? conv.name ?? '';
  const template = process.env.WHATSAPP_FOLLOWUP_TEMPLATE?.trim() || 'seguimiento';
  const r = await sendWhatsappTemplate({ to: conv.phone, template, locale: lead?.language === 'en' ? 'en' : 'es', params: [name] });
  const admin = supabaseAdmin();
  await admin.from('wa_messages').insert({ conversation_id: conv.id, direction: 'out', body: `[plantilla ${template}] ${name}`, status: r.ok ? 'sent' : 'failed', error: r.ok ? null : r.error, wa_id: r.ok ? r.id || null : null, sent_by: me.userId });
  await admin.from('wa_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conv.id);
  revalidatePath(`/admin/inbox/${conv.id}`);
  return r.ok ? { ok: true, message: 'Plantilla enviada. Cuando conteste, podrás escribirle libre 24 h.' } : { ok: false, error: `Meta no lo aceptó: ${r.error}` };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await requireRole('admin', 'staff');
  const supabase = await supabaseServer();
  await supabase.rpc('rpc_wa_mark_read', { p_conversation_id: conversationId });
  revalidatePath('/admin/inbox');
}

export async function archiveConversation(conversationId: string, archived: boolean): Promise<ActionResult> {
  await requireRole('admin', 'staff');
  const supabase = await supabaseServer();
  const { error } = await supabase.from('wa_conversations').update({ archived_at: archived ? new Date().toISOString() : null }).eq('id', conversationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/inbox');
  return { ok: true };
}

/** Para refrescar el hilo sin recargar: la bandeja pregunta cada 15 s si hay algo nuevo. */
export async function fetchThread(conversationId: string, sinceIso: string | null): Promise<{ messages: WaMessageRow[]; unread: number; lastInboundAt: string | null }> {
  await requireRole('admin', 'staff');
  const supabase = await supabaseServer();
  let q = supabase.from('wa_messages').select('id, direction, body, media_type, media_id, status, error, created_at').eq('conversation_id', conversationId).order('created_at');
  if (sinceIso) q = q.gt('created_at', sinceIso);
  const [{ data: messages }, { data: conv }] = await Promise.all([q, supabase.from('wa_conversations').select('unread, last_inbound_at').eq('id', conversationId).maybeSingle()]);
  return { messages: (messages ?? []) as WaMessageRow[], unread: Number(conv?.unread ?? 0), lastInboundAt: conv?.last_inbound_at ?? null };
}
