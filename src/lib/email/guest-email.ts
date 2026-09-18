import type { Locale } from '@/lib/config';

/**
 * Correo a un invitado: el mismo texto de la plantilla de WhatsApp, en HTML
 * sencillo con un botón al link personal. Sin dependencias: se prueba solo.
 */

const SUBJECT: Record<string, Record<Locale, (pareja: string) => string>> = {
  invite: { es: (p) => `${p}: tu invitación`, en: (p) => `${p}: your invitation` },
  reminder_pending: { es: (p) => `${p}: ¿nos confirmas?`, en: (p) => `${p}: can you RSVP?` },
  reminder_opened: { es: (p) => `${p}: te falta confirmar`, en: (p) => `${p}: one step left` },
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

export function renderGuestEmail(input: {
  templateKey: string;
  locale: Locale;
  couple: string;
  message: string;
  link: string;
  appName: string;
}): { subject: string; html: string; text: string } {
  const subject = (SUBJECT[input.templateKey] ?? SUBJECT.invite)[input.locale](input.couple);
  const button = input.locale === 'en' ? 'Open my invitation' : 'Abrir mi invitación';
  const footer = input.locale === 'en'
    ? `You received this email because ${input.couple} invited you. Sent with ${input.appName}.`
    : `Recibes este correo porque ${input.couple} te invitaron. Enviado con ${input.appName}.`;

  // El texto de la plantilla ya trae el link; en HTML se vuelve botón y el
  // resto se pinta tal cual, con saltos de línea.
  const body = escapeHtml(input.message.replace(input.link, '').replace(/\n{3,}/g, '\n\n').trim()).replace(/\n/g, '<br>');

  const html = `<!doctype html><html lang="${input.locale}"><body style="margin:0;background:#faf8f5;font-family:Helvetica,Arial,sans-serif;color:#2b2723">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e2dcd3">
<tr><td style="padding:32px 28px 8px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2">${escapeHtml(input.couple)}</td></tr>
<tr><td style="padding:8px 28px 24px;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td align="center" style="padding:0 28px 32px"><a href="${escapeHtml(input.link)}" style="display:inline-block;background:#2b2723;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:12px;letter-spacing:2px;text-transform:uppercase">${button}</a>
<p style="margin:16px 0 0;font-size:12px;color:#8a837a;word-break:break-all">${escapeHtml(input.link)}</p></td></tr>
</table>
<p style="max-width:520px;margin:16px auto 0;font-size:11px;color:#8a837a;text-align:center">${escapeHtml(footer)}</p>
</td></tr></table></body></html>`;

  return { subject, html, text: `${input.message}\n\n${footer}` };
}
