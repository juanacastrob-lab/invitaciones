import { getSaveTheDate } from '@/lib/invitations';
import { resolveLocale } from '@/lib/locale';
import { renderInvitationCard, OG_SIZE } from '@/lib/og-card';
import type { EventContent } from '@/schemas/event-content';

export const alt = 'Save the date';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 86400;

/** La misma tarjeta de la invitación, con "Save the date" arriba. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getSaveTheDate(slug);
  if (!data) return new Response('Not found', { status: 404 });
  const locale = resolveLocale({ languages: data.languages, defaultLanguage: data.default_language });
  const content = {
    version: 1, couple: data.couple, startsAt: data.startsAt, sectionOrder: ['cover'],
    cover: { ...(data.cover ?? {}), headline: { es: 'Save the date', en: 'Save the date' } },
    og: data.og ?? undefined,
    itinerary: data.venue ? { acts: [{ id: 'a', kind: 'otro', title: { es: 'x' }, startsAt: data.startsAt, venue: { name: data.venue, address: '-' } }] } : undefined,
  } as unknown as EventContent;
  return renderInvitationCard(content, data.timezone, locale, data.template);
}
