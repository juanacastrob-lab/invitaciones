import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getInvitation, localeFor, markOpened, type Invitation } from '@/lib/invitations';
import { pickText } from '@/schemas/event-content';
import { AuroraTemplate } from '@/templates/aurora';
import type { Locale } from '@/lib/config';
import { getSiteUrl } from '@/lib/env';

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

export async function invitationMetadata(
  slug: string,
  token: string | undefined,
  requestedLang: string | undefined,
): Promise<Metadata> {
  const invitation = await getInvitation(slug, token);
  if (!invitation) return { title: 'No encontrado' };

  const locale = localeFor(invitation, requestedLang);
  const c = invitation.event.content;
  const couple = `${c.couple.partnerA} & ${c.couple.partnerB}`;

  const title = pickText(c.og?.title, locale) ?? couple;
  const description = pickText(c.og?.description, locale) ?? '';
  const siteUrl = getSiteUrl();

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
    twitter: {
      card: invitation.event.og_image_url ? 'summary_large_image' : 'summary',
      title,
      description,
    },
    ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  };
}

export async function InvitationPage({
  slug,
  token,
  previewKey,
  requestedLang,
}: {
  slug: string;
  token?: string;
  previewKey?: string;
  requestedLang?: string;
}) {
  const invitation = await getInvitation(slug, token, previewKey);
  if (!invitation) notFound();

  // Primera apertura del link personal. No debe tumbar la página si falla.
  if (invitation.token_valid && token) {
    await markOpened(slug, token);
  }

  const locale = localeFor(invitation, requestedLang);
  const path = token ? `/i/${slug}/${token}` : `/i/${slug}`;

  return <AuroraTemplate invitation={invitation} locale={locale} path={path} />;
}
