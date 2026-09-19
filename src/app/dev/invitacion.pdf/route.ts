import { notFound } from 'next/navigation';
import { demoEventContent } from '@/demo/demo-event';
import { templateContent } from '@/lib/admin/template';
import { isEventType } from '@/lib/event-types';
import { renderInvitationPdf } from '@/lib/pdf/invitation-pdf';

export const dynamic = 'force-dynamic';

/** PDF del demo (o de un tipo con ?type=xv), para revisar el diseño. No existe en producción. */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') notFound();
  const sp = new URL(req.url).searchParams;
  const type = sp.get('type');
  const locale = sp.get('lang') === 'en' ? 'en' : 'es';
  const content = isEventType(type) && type !== 'boda' ? templateContent({ partnerA: 'Sofía Valentina', startsAt: '2027-06-12T13:00', type }) : demoEventContent;
  const pdf = await renderInvitationPdf({ content, timezone: 'America/Mexico_City', locale, url: 'https://holaboda.mx/i/juan-y-ana', rsvpDeadline: '2027-02-13T23:59:59-06:00' });
  return new Response(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf' } });
}
