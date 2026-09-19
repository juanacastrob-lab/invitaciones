import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseWebhook, phoneKey } from '@/lib/whatsapp/inbox';
import { markWhatsappRead } from '@/lib/whatsapp/cloud';

export const dynamic = 'force-dynamic';

/**
 * Webhook de la WhatsApp Cloud API.
 *
 * GET: Meta verifica la URL con WHATSAPP_VERIFY_TOKEN (lo inventa Juan y lo
 * pone igual en Meta y en Netlify).
 * POST: llegan mensajes y estados. Se valida la firma con WHATSAPP_APP_SECRET
 * y se guarda todo; el equipo lo ve en /admin/inbox. Siempre se responde 200
 * rápido: si Meta no recibe 200, reintenta y acaba desactivando el webhook.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const verify = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (verify && url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === verify) {
    return new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 });
  }
  return new Response('forbidden', { status: 403 });
}

function validSignature(raw: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!secret) return false;
  if (!header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  const got = header.slice(7);
  return got.length === expected.length && timingSafeEqual(Buffer.from(got, 'hex'), Buffer.from(expected, 'hex'));
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'bad signature' }, { status: 401 });
  }
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }
  const { messages, statuses } = parseWebhook(payload);
  if (!messages.length && !statuses.length) return NextResponse.json({ ok: true });

  const admin = supabaseAdmin();
  try {
    for (const m of messages) {
      // Conversación por teléfono; se liga sola al prospecto con ese número.
      const { data: existing } = await admin.from('wa_conversations').select('id, lead_id, unread').eq('phone', m.from).maybeSingle();
      let convId = existing?.id as string | undefined;
      let leadId = existing?.lead_id as string | null | undefined;
      if (!convId) {
        const { data: lead } = await admin.from('leads').select('id').in('phone', [`+${m.from}`, `+${phoneKey(m.from)}`]).order('created_at', { ascending: false }).limit(1).maybeSingle();
        leadId = lead?.id ?? null;
        if (!leadId) {
          // Nadie lo conocía: nace como prospecto por WhatsApp para que no se pierda.
          const { data: created } = await admin.from('leads').insert({
            partner_a: m.name ?? `WhatsApp ${m.from.slice(-4)}`, phone: `+${m.from}`, country: m.from.startsWith('52') ? 'MX' : 'US',
            language: 'es', source: 'whatsapp', consent_at: new Date().toISOString(), message: m.body,
          }).select('id').single();
          leadId = created?.id ?? null;
        }
        const { data: conv } = await admin.from('wa_conversations').insert({ phone: m.from, name: m.name, lead_id: leadId, last_inbound_at: m.timestamp.toISOString(), last_message_at: m.timestamp.toISOString(), unread: 0 }).select('id').single();
        convId = conv?.id;
        if (!convId) continue;
      }
      const { error } = await admin.from('wa_messages').insert({ conversation_id: convId, direction: 'in', wa_id: m.waId, body: m.body, media_type: m.mediaType, media_id: m.mediaId, status: 'received', created_at: m.timestamp.toISOString() });
      if (error) { if (error.code !== '23505') console.error('[wa] mensaje:', error.message); continue; } // 23505 = reintento de Meta
      await admin.from('wa_conversations').update({
        name: m.name ?? undefined, last_inbound_at: m.timestamp.toISOString(), last_message_at: m.timestamp.toISOString(),
        unread: Number(existing?.unread ?? 0) + 1, archived_at: null,
      }).eq('id', convId);
      if (leadId) await admin.from('leads').update({ last_contact_at: m.timestamp.toISOString() }).eq('id', leadId);
      void markWhatsappRead(m.waId);
    }
    for (const s of statuses) {
      await admin.from('wa_messages').update({ status: s.status, error: s.error }).eq('wa_id', s.waId);
    }
  } catch (e) {
    console.error('[wa] webhook:', (e as Error).message);
  }
  return NextResponse.json({ ok: true });
}
