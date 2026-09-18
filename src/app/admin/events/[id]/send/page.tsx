import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth';
import { getEvent, listGuests, listTemplates } from '@/lib/admin/queries';
import { getSiteUrl } from '@/lib/env';
import { AdminShell } from '@/components/admin/AdminShell';
import { EventTabs } from '@/components/admin/EventTabs';
import { SendQueue } from '@/components/admin/SendQueue';
import { Notice } from '@/components/ui';
import type { EventContent } from '@/schemas/event-content';

export const dynamic = 'force-dynamic';

export default async function SendPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole('admin', 'staff');
  const { id } = await params;
  const [event, guests, templates] = await Promise.all([getEvent(id), listGuests(id), listTemplates()]);
  if (!event) notFound();
  const c = event.content as unknown as EventContent;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const site = host ? `${h.get('x-forwarded-proto') ?? 'https'}://${host}` : (getSiteUrl() ?? '');

  return (
    <AdminShell me={me} title={`${c.couple.partnerA} & ${c.couple.partnerB}`} current="/admin/events">
      <EventTabs id={id} current="envio" />
      {event.status !== 'publicado' ? (
        <div className="mb-4"><Notice kind="error">El evento no está publicado: los links personales todavía no abren para los invitados. Publícalo en la pestaña Datos antes de enviar.</Notice></div>
      ) : null}
      <SendQueue eventId={id} slug={event.slug} siteUrl={site} couple={`${c.couple.partnerA} & ${c.couple.partnerB}`} startsAt={c.startsAt} timezone={event.timezone} guests={guests} templates={templates} />
    </AdminShell>
  );
}
