import { notFound } from 'next/navigation';
import { AuroraTemplate } from '@/templates/aurora';
import { demoEventContent } from '@/demo/demo-event';
import { isLocale, DEFAULT_LOCALE } from '@/lib/config';
import type { Invitation } from '@/lib/invitations';

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
  searchParams: Promise<{ lang?: string; token?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();

  const { lang, token } = await searchParams;
  const conToken = token === '1';

  const invitation: Invitation = {
    access: conToken ? 'token' : 'public',
    token_valid: conToken,
    event: {
      slug: 'ana-y-luis',
      type: 'boda',
      template: 'aurora',
      languages: ['es', 'en'],
      default_language: 'es',
      timezone: 'America/Mexico_City',
      status: 'publicado',
      rsvp_deadline: '2027-02-13T23:59:59-06:00',
      allow_public_rsvp: false,
      og_image_url: null,
      content: conToken
        ? demoEventContent
        : // Sin token, la base quita los datos bancarios antes de responder.
          {
            ...demoEventContent,
            gifts: demoEventContent.gifts
              ? { ...demoEventContent.gifts, bank: undefined, envelopes: false }
              : undefined,
          },
    },
    guest: conToken
      ? {
          display_name: 'Familia López Ramírez',
          passes: 4,
          language: 'es',
          status: 'pending',
          confirmed_count: 0,
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
