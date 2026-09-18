import type { Config } from '@netlify/functions';

/**
 * Cada 15 minutos le pide a la app que mande los recordatorios que toquen.
 * La lógica vive en /api/cron/reminders; esto solo la despierta con el secreto.
 * Sin CRON_SECRET en Netlify no hace nada.
 */
export default async () => {
  const secret = process.env.CRON_SECRET?.trim();
  const site = (process.env.URL ?? process.env.DEPLOY_PRIME_URL ?? '').replace(/\/$/, '');
  if (!secret || !site) return new Response('sin CRON_SECRET o URL', { status: 200 });

  // Varias tandas por corrida, hasta que ya no haya a quién mandarle.
  for (let i = 0; i < 4; i++) {
    const res = await fetch(`${site}/api/cron/reminders`, { method: 'POST', headers: { Authorization: `Bearer ${secret}` } });
    const body = (await res.json().catch(() => ({}))) as { more?: boolean };
    console.log('[reminders-cron]', res.status, JSON.stringify(body));
    if (!res.ok || !body.more) break;
  }
  return new Response('ok');
};

export const config: Config = { schedule: '*/15 * * * *' };
