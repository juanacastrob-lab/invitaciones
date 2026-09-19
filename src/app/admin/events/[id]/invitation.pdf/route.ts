import { requireRole } from '@/lib/auth';
import { getEvent } from '@/lib/admin/queries';
import { renderInvitationPdf } from '@/lib/pdf/invitation-pdf';
import { getSiteUrl } from '@/lib/env';
import { isLocale } from '@/lib/config';
import type { EventContent } from '@/schemas/event-content';

export const dynamic = 'force-dynamic';

/** PDF de la invitación. Lo bajan el equipo (aquí) y los novios (/panel). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole('admin', 'staff', 'client');
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return new Response('No encontrado', { status: 404 });

  const lang = new URL(req.url).searchParams.get('lang');
  const locale = isLocale(lang) && event.languages.includes(lang) ? lang : (isLocale(event.default_language) ? event.default_language : 'es');
  const site = getSiteUrl();
  const pdf = await renderInvitationPdf({
    content: event.content as unknown as EventContent,
    timezone: event.timezone,
    locale,
    url: event.status === 'publicado' && site ? `${site}/i/${event.slug}` : undefined,
    rsvpDeadline: event.rsvp_deadline,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${event.slug}-${locale}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
