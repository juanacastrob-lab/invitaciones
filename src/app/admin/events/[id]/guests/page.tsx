import { notFound } from 'next/navigation';
import { eventNames } from '@/lib/event-types';
import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth';
import { getEvent, listGuests } from '@/lib/admin/queries';
import { getSiteUrl } from '@/lib/env';
import { AdminShell } from '@/components/admin/AdminShell';
import { EventTabs } from '@/components/admin/EventTabs';
import { GuestsManager } from '@/components/admin/GuestsManager';
import { LinkButton } from '@/components/ui';
import type { EventContent } from '@/schemas/event-content';

export const dynamic = 'force-dynamic';

export default async function GuestsPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole('admin', 'staff');
  const { id } = await params;
  const [event, guests] = await Promise.all([getEvent(id), listGuests(id)]);
  if (!event) notFound();
  const c = event.content as unknown as EventContent;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const site = host ? `${h.get('x-forwarded-proto') ?? 'https'}://${host}` : (getSiteUrl() ?? '');

  return (
    <AdminShell me={me} title={eventNames(c.couple)} current="/admin/events"
      actions={<LinkButton href={`/admin/events/${id}/guests/export.csv`}>Exportar CSV</LinkButton>}>
      <EventTabs id={id} current="invitados" />
      <GuestsManager eventId={id} slug={event.slug} siteUrl={site} guests={guests} />
    </AdminShell>
  );
}
