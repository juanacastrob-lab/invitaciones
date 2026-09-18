import 'server-only';

/**
 * Envío de correo por Resend (https://resend.com), sin SDK: una llamada HTTP.
 * Si faltan RESEND_API_KEY o EMAIL_FROM, nada se manda y la app lo dice.
 * EMAIL_FROM tiene que ser de un dominio verificado en Resend, p. ej.
 * "Hola Boda <hola@holaboda.mx>".
 */

export function emailConfig(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  return apiKey && from ? { apiKey, from } : null;
}

export async function sendEmail(input: { to: string; subject: string; html: string; text: string; replyTo?: string }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const cfg = emailConfig();
  if (!cfg) return { ok: false, error: 'Correo no configurado (RESEND_API_KEY / EMAIL_FROM).' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: cfg.from, to: [input.to], subject: input.subject, html: input.html, text: input.text, reply_to: input.replyTo }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) return { ok: false, error: data.message ?? `Resend respondió ${res.status}` };
    return { ok: true, id: data.id ?? '' };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
