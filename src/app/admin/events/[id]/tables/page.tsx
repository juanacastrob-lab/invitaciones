import { notFound } from 'next/navigation';
import { eventNames } from '@/lib/event-types';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { requireRole } from '@/lib/auth';
import { getEvent, listGuests, listTables } from '@/lib/admin/queries';
import { AdminShell } from '@/components/admin/AdminShell';
import { EventTabs } from '@/components/admin/EventTabs';
import { TablesManager } from '@/components/admin/TablesManager';
import type { EventContent } from '@/schemas/event-content';

export const dynamic = 'force-dynamic';

export default async function TablesPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole('admin', 'staff');
  const { id } = await params;
  const [event, guests, tables, messages] = await Promise.all([getEvent(id), listGuests(id), listTables(id), getMessages({ locale: 'es' })]);
  if (!event) notFound();
  const c = event.content as unknown as EventContent;
  return (
    <AdminShell me={me} title={eventNames(c.couple)} current="/admin/events">
      <EventTabs id={id} current="mesas" />
      <NextIntlClientProvider locale="es" messages={{ tables: messages.tables }}>
        <TablesManager eventId={id} tables={tables} guests={guests} exportHref={`/admin/events/${id}/tables/export.csv`} />
      </NextIntlClientProvider>
    </AdminShell>
  );
}
