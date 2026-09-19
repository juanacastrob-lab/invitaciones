import 'server-only';

/**
 * WhatsApp Cloud API (Meta). Para mandar mensajes que inicia el negocio,
 * Meta exige plantillas aprobadas: aquí cada plantilla de message_templates
 * (invite, reminder_pending, event_soon...) tiene que existir en el Business
 * Manager con el MISMO nombre, idioma es_MX / en_US y estos parámetros en
 * este orden: {{1}} nombre, {{2}} pareja, {{3}} fecha, {{4}} link.
 *
 * Sin WHATSAPP_TOKEN y WHATSAPP_PHONE_ID no se manda nada y la app lo dice.
 */

export function whatsappConfig(): { token: string; phoneId: string } | null {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_ID?.trim();
  return token && phoneId ? { token, phoneId } : null;
}

export async function sendWhatsappTemplate(input: {
  to: string;
  template: string;
  locale: 'es' | 'en';
  params: string[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const cfg = whatsappConfig();
  if (!cfg) return { ok: false, error: 'WhatsApp no configurado (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID).' };
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${cfg.phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: input.to.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: input.template,
          language: { code: input.locale === 'en' ? 'en_US' : 'es_MX' },
          components: [{ type: 'body', parameters: input.params.map((text) => ({ type: 'text', text })) }],
        },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    if (!res.ok) return { ok: false, error: data.error?.message ?? `Meta respondió ${res.status}` };
    return { ok: true, id: data.messages?.[0]?.id ?? '' };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Mensaje libre (texto). Meta solo lo acepta dentro de las 24 h siguientes al
 * último mensaje del cliente; fuera de eso hay que usar una plantilla.
 */
export async function sendWhatsappText(input: { to: string; body: string }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const cfg = whatsappConfig();
  if (!cfg) return { ok: false, error: 'WhatsApp no configurado (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID).' };
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${cfg.phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: input.to.replace(/\D/g, ''), type: 'text', text: { body: input.body, preview_url: true } }),
    });
    const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    if (!res.ok) return { ok: false, error: data.error?.message ?? `Meta respondió ${res.status}` };
    return { ok: true, id: data.messages?.[0]?.id ?? '' };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Marca como leído en el WhatsApp del cliente (las palomitas azules). Si falla, no pasa nada. */
export async function markWhatsappRead(waMessageId: string): Promise<void> {
  const cfg = whatsappConfig();
  if (!cfg || !waMessageId) return;
  await fetch(`https://graph.facebook.com/v21.0/${cfg.phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: waMessageId }),
  }).catch(() => undefined);
}

/** Baja un archivo (foto, audio, documento) que mandó el cliente. Dos pasos: URL firmada y luego el binario. */
export async function fetchWhatsappMedia(mediaId: string): Promise<{ ok: true; bytes: ArrayBuffer; mime: string } | { ok: false; error: string }> {
  const cfg = whatsappConfig();
  if (!cfg) return { ok: false, error: 'WhatsApp no configurado.' };
  if (!/^[\w.-]+$/.test(mediaId)) return { ok: false, error: 'id inválido' };
  try {
    const meta = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, { headers: { Authorization: `Bearer ${cfg.token}` } });
    const info = (await meta.json().catch(() => ({}))) as { url?: string; mime_type?: string; error?: { message?: string } };
    if (!meta.ok || !info.url) return { ok: false, error: info.error?.message ?? `Meta respondió ${meta.status}` };
    const file = await fetch(info.url, { headers: { Authorization: `Bearer ${cfg.token}` } });
    if (!file.ok) return { ok: false, error: `descarga ${file.status}` };
    return { ok: true, bytes: await file.arrayBuffer(), mime: info.mime_type ?? file.headers.get('content-type') ?? 'application/octet-stream' };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
