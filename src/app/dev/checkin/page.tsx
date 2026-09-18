import { notFound } from 'next/navigation';
import { CheckinScreen } from '@/components/checkin/CheckinScreen';
import type { CheckinGuest } from '@/actions/checkin';

export const dynamic = 'force-dynamic';

/** Check-in con datos de mentira, para revisar el diseño. No existe en producción. */
export default function DevCheckin() {
  if (process.env.NODE_ENV === 'production') notFound();
  const g = (id: string, name: string, passes: number, status: CheckinGuest['status'], confirmed: number, arrived: number, table: string | null): CheckinGuest =>
    ({ id, display_name: name, passes, status, confirmed_count: confirmed, table_no: table, group_tag: null, checked_in_at: arrived ? '2027-03-13T23:10:00Z' : null, checked_in_count: arrived });
  const guests = [
    g('a', 'Familia López Ramírez', 4, 'confirmed', 3, 3, '1'), g('b', 'Mariana Ruiz', 2, 'confirmed', 2, 0, '1'),
    g('c', 'Roberto y Carmen Díaz', 3, 'pending', 0, 0, '2'), g('d', 'The Miller Family', 4, 'confirmed', 4, 0, '3'), g('e', 'Daniel Okonkwo', 1, 'declined', 0, 0, null),
  ];
  return (
    <main className="mx-auto max-w-lg bg-stone-50 px-4 py-6">
      <h1 className="mb-4 font-serif text-3xl">Check-in</h1>
      <CheckinScreen eventId="demo" slug="juan-y-ana" initial={guests} demo />
    </main>
  );
}
