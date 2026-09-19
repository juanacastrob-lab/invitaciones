/**
 * Lo que entiende la bandeja del webhook de Meta, sin base ni red: puro
 * parseo. Así se prueba con node --test.
 */

export interface InboundMessage {
  waId: string;
  from: string;          // teléfono sin '+', como lo manda Meta
  name: string | null;   // nombre de perfil del contacto
  body: string | null;
  mediaType: string | null;
  mediaId: string | null;
  timestamp: Date;
}

export interface StatusUpdate {
  waId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  error: string | null;
}

interface MetaPayload {
  object?: string;
  entry?: {
    changes?: {
      field?: string;
      value?: {
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: Record<string, unknown>[];
        statuses?: { id?: string; status?: string; errors?: { title?: string; message?: string }[] }[];
      };
    }[];
  }[];
}

const MEDIA = ['image', 'audio', 'video', 'document', 'sticker'] as const;

/** Saca mensajes entrantes y cambios de estado de un payload del webhook. */
export function parseWebhook(payload: unknown): { messages: InboundMessage[]; statuses: StatusUpdate[] } {
  const messages: InboundMessage[] = [];
  const statuses: StatusUpdate[] = [];
  const p = payload as MetaPayload;
  if (p?.object !== 'whatsapp_business_account') return { messages, statuses };

  for (const entry of p.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value;
      if (!v) continue;
      const names = new Map((v.contacts ?? []).map((c) => [c.wa_id ?? '', c.profile?.name ?? null]));

      for (const m of v.messages ?? []) {
        const id = typeof m.id === 'string' ? m.id : null;
        const from = typeof m.from === 'string' ? m.from.replace(/\D/g, '') : null;
        if (!id || !from) continue;
        const type = typeof m.type === 'string' ? m.type : 'unknown';
        const ts = typeof m.timestamp === 'string' ? new Date(Number(m.timestamp) * 1000) : new Date();
        let body: string | null = null;
        let mediaType: string | null = null;
        let mediaId: string | null = null;
        if (type === 'text') body = (m.text as { body?: string })?.body ?? null;
        else if ((MEDIA as readonly string[]).includes(type)) {
          const media = m[type] as { id?: string; caption?: string } | undefined;
          mediaType = type;
          mediaId = media?.id ?? null;
          body = media?.caption ?? null;
        } else if (type === 'button') body = (m.button as { text?: string })?.text ?? null;
        else if (type === 'interactive') {
          const i = m.interactive as { button_reply?: { title?: string }; list_reply?: { title?: string } };
          body = i?.button_reply?.title ?? i?.list_reply?.title ?? null;
        } else if (type === 'location') {
          const l = m.location as { latitude?: number; longitude?: number; name?: string };
          body = [l?.name, l?.latitude != null ? `${l.latitude},${l.longitude}` : null].filter(Boolean).join(' · ') || null;
          mediaType = 'location';
        } else if (type === 'contacts') { body = null; mediaType = 'contacts'; }
        else if (type === 'reaction') continue; // no vale la pena guardarlas
        else if (type === 'unsupported') { mediaType = 'unsupported'; }
        messages.push({ waId: id, from, name: names.get(from) ?? null, body, mediaType, mediaId, timestamp: Number.isNaN(ts.getTime()) ? new Date() : ts });
      }

      for (const s of v.statuses ?? []) {
        if (!s.id || !s.status) continue;
        const status = s.status as StatusUpdate['status'];
        if (!['sent', 'delivered', 'read', 'failed'].includes(status)) continue;
        statuses.push({ waId: s.id, status, error: s.errors?.[0]?.message ?? s.errors?.[0]?.title ?? null });
      }
    }
  }
  return { messages, statuses };
}

/** Meta solo deja contestar libre 24 h después del último mensaje del cliente. */
export function withinServiceWindow(lastInboundAt: string | Date | null | undefined, now = new Date()): boolean {
  if (!lastInboundAt) return false;
  const t = new Date(lastInboundAt).getTime();
  return now.getTime() - t < 24 * 60 * 60 * 1000;
}

/** "5215512345678" → "+52 1 55 1234 5678"-ish, solo para mostrar. */
export function displayPhone(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.startsWith('521') && d.length === 13) return `+52 ${d.slice(3, 5)} ${d.slice(5, 9)} ${d.slice(9)}`;
  if (d.startsWith('52') && d.length === 12) return `+52 ${d.slice(2, 4)} ${d.slice(4, 8)} ${d.slice(8)}`;
  if (d.startsWith('1') && d.length === 11) return `+1 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return `+${d}`;
}

/** Los teléfonos de leads están en E.164 (+52155...); Meta los manda sin '+'. Para cruzarlos. */
export function phoneKey(raw: string): string {
  let d = raw.replace(/\D/g, '');
  // México: Meta a veces manda 52 1 55... y otras 52 55...; se normaliza sin el 1.
  if (d.startsWith('521') && d.length === 13) d = '52' + d.slice(3);
  return d;
}
