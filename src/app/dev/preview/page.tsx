import { notFound } from 'next/navigation';
import { AuroraTemplate } from '@/templates/aurora';
import { demoEventContent } from '@/demo/demo-event';
import { isLocale, DEFAULT_LOCALE } from '@/lib/config';
import type { Invitation } from '@/lib/invitations';
import { isEventType } from '@/lib/event-types';
import { templateContent } from '@/lib/admin/template';

/**
 * Vista previa de la plantilla, sin base de datos.
 *
 * Sirve para revisar el diseño en un celular mientras se trabaja, sin cargar
 * un evento real ni gastar llamadas a Supabase. No existe en producción.
 */
export const dynamic = 'force-dynamic';

export default async function DevPreview({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; token?: string; type?: string; template?: string; confirmed?: string; font?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();

  const { lang, token, type, template, confirmed, font } = await searchParams;
  const conToken = token === '1';
  // ?type=xv: la plantilla de un evento de una sola persona, para revisar el diseño.
  const content = { ...(isEventType(type) && type !== 'boda'
    ? templateContent({ partnerA: 'Sofía Valentina', startsAt: demoEventContent.startsAt, type })
    : demoEventContent), ...(font ? { font } : {}) };

  const invitation: Invitation = {
    access: conToken ? 'token' : 'public',
    token_valid: conToken,
    event: {
      slug: 'ana-y-luis',
      type: isEventType(type) ? type : 'boda',
      template: template ?? 'aurora',
      languages: ['es', 'en'],
      default_language: 'es',
      timezone: 'America/Mexico_City',
      status: 'publicado',
      rsvp_deadline: '2027-02-13T23:59:59-06:00',
      allow_public_rsvp: false,
      og_image_url: null,
      checkin_enabled: true,
      content: conToken
        ? content
        : // Sin token, la base quita los datos bancarios antes de responder.
          {
            ...content,
            gifts: content.gifts
              ? { ...content.gifts, bank: undefined, envelopes: false }
              : undefined,
          },
    },
    guest: conToken
      ? {
          display_name: 'Familia López Ramírez',
          passes: 4,
          language: 'es',
          status: confirmed === '1' ? 'confirmed' : 'pending',
          confirmed_count: confirmed === '1' ? 3 : 0,
          group_tag: 'Familia',
          responded_at: null,
          response: null,
        }
      : null,
  };

  return (
    <AuroraTemplate
      invitation={invitation}
      locale={isLocale(lang) ? lang : DEFAULT_LOCALE}
      path="/dev/preview"
      token={conToken ? 'token-de-prueba' : undefined}
      previewMode
    />
  );
}
