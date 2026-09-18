import { whatsappLink } from '@/lib/config';
import { formatDateShort } from '@/lib/dates';
import type { Locale } from '@/lib/config';

/**
 * Rellena una plantilla de message_templates con los datos del invitado.
 * Variables: {nombre} {pareja} {fecha} {link} {pases}
 */
export function renderTemplate(
  body: string,
  vars: { nombre: string; pareja: string; fecha: string; link: string; pases: string },
): string {
  return body.replace(/\{(nombre|pareja|fecha|link|pases)\}/g, (_, k: keyof typeof vars) => vars[k]);
}

export function guestLink(siteUrl: string, slug: string, token: string): string {
  return `${siteUrl}/i/${slug}/${token}`;
}

export function passesLabel(n: number, locale: Locale): string {
  return locale === 'en' ? `${n} ${n === 1 ? 'pass' : 'passes'}` : `${n} ${n === 1 ? 'pase' : 'pases'}`;
}

export function buildGuestMessage(input: {
  template: string;
  guestName: string;
  passes: number;
  locale: Locale;
  couple: string;
  startsAt: string;
  timezone: string;
  link: string;
}): string {
  return renderTemplate(input.template, {
    nombre: input.guestName,
    pareja: input.couple,
    fecha: formatDateShort(input.startsAt, input.timezone, input.locale),
    link: input.link,
    pases: passesLabel(input.passes, input.locale),
  });
}

/** Link de wa.me al número del invitado con el mensaje ya escrito. */
export function guestWhatsappUrl(phone: string, message: string): string {
  return whatsappLink(message, phone);
}
