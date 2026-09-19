import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { TablesManager } from '@/components/admin/TablesManager';
import type { GuestRow, TableRow } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

/** Mesas con datos de mentira, para revisar el diseño. No existe en producción. */
export default async function DevTables() {
  if (process.env.NODE_ENV === 'production') notFound();
  const messages = await getMessages({ locale: 'es' });
  const tables: TableRow[] = [
    { table_id: 't1', name: 'Mesa 1', capacity: 10, sort_order: 1, guests: 3, passes: 9, confirmed_people: 6 },
    { table_id: 't2', name: 'Mesa 2', capacity: 8, sort_order: 2, guests: 2, passes: 9, confirmed_people: 4 },
    { table_id: 't3', name: 'Novios', capacity: null, sort_order: 3, guests: 0, passes: 0, confirmed_people: 0 },
  ];
  const g = (id: string, name: string, passes: number, table_id: string | null, status: GuestRow['status'] = 'confirmed', confirmed = passes): GuestRow =>
    ({ id, display_name: name, passes, phone: null, email: null, language: 'es', token: 'x', group_tag: 'Familia', table_no: null, table_id, status, confirmed_count: status === 'confirmed' ? confirmed : 0, sent_at: null, opened_at: null, responded_at: null, reminder_count: 0 });
  const guests = [
    g('a', 'Familia López Ramírez', 4, 't1'), g('b', 'Mariana Ruiz', 2, 't1'), g('c', 'Roberto y Carmen Díaz', 3, 't1', 'pending'),
    g('d', 'Familia Contreras', 5, 't2'), g('e', 'The Miller Family', 4, 't2', 'pending'),
    g('f', 'Sarah Whitfield', 2, null), g('h', 'Daniel Okonkwo', 1, null, 'declined'),
  ];
  return (
    <main className="mx-auto max-w-4xl bg-stone-50 px-6 py-8">
      <NextIntlClientProvider locale="es" messages={{ tables: messages.tables }}>
        <TablesManager eventId="demo" tables={tables} guests={guests} exportHref="#" />
      </NextIntlClientProvider>
    </main>
  );
}
