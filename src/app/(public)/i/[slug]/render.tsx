import { notFound } from 'next/navigation';
import { eventNames } from '@/lib/event-types';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { getInvitation, localeFor, markOpened, type Invitation } from '@/lib/invitations';
import { pickText } from '@/schemas/event-content';
import { AuroraTemplate } from '@/templates/aurora';
import type { Locale } from '@/lib/config';
import { getSiteUrl } from '@/lib/env';
import { DEMO_SLUG } from '@/demo/demo-event';
import { isTemplateId } from '@/templates/registry';

/**
 * Lo compartido entre el link general y el personal.
 *
 * Las dos rutas pintan la misma invitación: la diferencia es si hay token, y
 * eso lo decide la base, no el componente.
 */

export async function loadOrNotFound(
  slug: string,
  token?: string,
  previewKey?: string,
): Promise<{ invitation: Invitation; locale: Locale }> {
  const invitation = await getInvitation(slug, token, previewKey);
  if (!invitation) notFound();

  return { invitation, locale: localeFor(invitation) };
}

async function requestOrigin(): Promise<string | undefined> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return undefined;
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function invitationMetadata(
  slug: string,
  token: string | undefined,
  requestedLang: string | undefined,
): Promise<Metadata> {
  const invitation = await getInvitation(slug, token);
  if (!invitation) return { title: 'No encontrado' };

  const locale = localeFor(invitation, requestedLang);
  const c = invitation.event.content;
  const couple = eventNames(c.couple);

  const title = pickText(c.og?.title, locale) ?? couple;
  const description = pickText(c.og?.description, locale) ?? '';
  // La imagen y el og:url se arman con el dominio desde el que se abrió el
  // link (dev, netlify.app o holaboda.mx), no con la variable de entorno:
  // WhatsApp tiene que poder bajar la foto del mismo lugar que la página.
  const siteUrl = (await requestOrigin()) ?? getSiteUrl();

  return {
    title,
    description,
    // El nombre del invitado NO va aquí a propósito: estos links se reenvían
    // en grupos de WhatsApp y el preview lo ve todo el mundo.
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'es' ? 'es_MX' : 'en_US',
      ...(invitation.event.og_image_url ? { images: [invitation.event.og_image_url] } : {}),
      ...(siteUrl ? { url: `${siteUrl}/i/${slug}` } : {}),
    },
    // La imagen la genera opengraph-image.tsx (junto a este archivo); solo se
    // sobreescribe si el evento trae una subida a mano en og_image_url.
    twitter: { card: 'summary_large_image', title, description },
    ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  };
}

export async function InvitationPage({
  slug,
  token,
  previewKey,
  requestedLang,
  requestedTemplate,
}: {
  slug: string;
  token?: string;
  previewKey?: string;
  requestedLang?: string;
  /** Solo el demo: probar una plantilla desde la landing sin tocar la base. */
  requestedTemplate?: string;
}) {
  const loaded = await getInvitation(slug, token, previewKey);
  if (!loaded) notFound();
  const invitation = slug === DEMO_SLUG && isTemplateId(requestedTemplate)
    ? { ...loaded, event: { ...loaded.event, template: requestedTemplate } }
    : loaded;

  // Primera apertura del link personal. No debe tumbar la página si falla.
  if (invitation.token_valid && token) {
    await markOpened(slug, token);
  }

  const locale = localeFor(invitation, requestedLang);
  const path = token ? `/i/${slug}/${token}` : `/i/${slug}`;

  return <AuroraTemplate invitation={invitation} locale={locale} path={path} token={token} />;
}
