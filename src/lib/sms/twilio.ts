import 'server-only';

/**
 * SMS por Twilio, para Estados Unidos y Canadá donde WhatsApp no es universal.
 * Sin TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_FROM no se manda nada.
 * Cada SMS cuesta (≈ 1 centavo de dólar en EE. UU.); los links largos cuentan.
 */

export function smsConfig(): { sid: string; token: string; from: string } | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM?.trim();
  return sid && token && from ? { sid, token, from } : null;
}

export async function sendSms(input: { to: string; body: string }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const cfg = smsConfig();
  if (!cfg) return { ok: false, error: 'SMS no configurado (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM).' };
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${cfg.sid}:${cfg.token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: input.to, From: cfg.from, Body: input.body.slice(0, 1500) }),
    });
    const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok) return { ok: false, error: data.message ?? `Twilio respondió ${res.status}` };
    return { ok: true, id: data.sid ?? '' };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
