import { notFound } from 'next/navigation';
import { getInvitation, localeFor } from '@/lib/invitations';
import { pickText } from '@/schemas/event-content';
import { buildIcs } from '@/lib/dates';

/** El archivo que abre el calendario de iPhone, Outlook y casi todo lo demás. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const invitation = await getInvitation(slug);
  if (!invitation) notFound();

  const locale = localeFor(invitation);
  const c = invitation.event.content;
  const first = c.itinerary?.acts[0];

  const ics = buildIcs({
    title: `${c.couple.partnerA} & ${c.couple.partnerB}`,
    description: pickText(c.og?.description, locale),
    location: first ? `${first.venue.name}, ${first.venue.address}` : undefined,
    startsAt: c.startsAt,
    timeZone: invitation.event.timezone,
    uid: `${slug}@holaboda`,
    url: process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/i/${slug}`
      : undefined,
  });

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.ics"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
