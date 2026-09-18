import { notFound } from 'next/navigation';
import { demoEventContent } from '@/demo/demo-event';
import { ThankYouView } from '@/components/invitation/ThankYouView';
import type { Invitation } from '@/lib/invitations';

export const dynamic = 'force-dynamic';

/** Agradecimiento del demo, para revisar el diseño. No existe en producción. */
export default async function DevThankYou({ searchParams }: { searchParams: Promise<{ lang?: string; template?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { lang, template } = await searchParams;
  const invitation: Invitation = {
    access: 'token', token_valid: true,
    event: { slug: 'juan-y-ana', type: 'boda', template: template ?? 'aurora', languages: ['es', 'en'], default_language: 'es', timezone: 'America/Mexico_City', status: 'finalizado', rsvp_deadline: null, allow_public_rsvp: false, og_image_url: null, checkin_enabled: false,
      content: { ...demoEventContent, thankYou: { title: { es: 'Gracias', en: 'Thank you' }, body: { es: 'Fue la mejor noche de nuestras vidas y fue gracias a ustedes. Gracias por bailar, por brindar y por quedarse hasta el final.\n\nCon cariño,', en: 'It was the best night of our lives, and it was because of you. Thank you for dancing, for the toasts, and for staying until the end.\n\nWith love,' } } } },
    guest: { display_name: 'Familia López Ramírez', passes: 4, language: 'es', status: 'confirmed', confirmed_count: 3, group_tag: null, responded_at: null, response: null },
  };
  return <ThankYouView invitation={invitation} locale={lang === 'en' ? 'en' : 'es'} backHref="/dev/preview?token=1" />;
}
