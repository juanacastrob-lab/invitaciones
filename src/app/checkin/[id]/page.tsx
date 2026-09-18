import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getEvent } from '@/lib/admin/queries';
import { checkinSnapshot } from '@/actions/checkin';
import { SessionBar } from '@/components/auth/SessionBar';
import { CheckinScreen } from '@/components/checkin/CheckinScreen';
import { eventNames } from '@/lib/event-types';
import type { EventContent } from '@/schemas/event-content';

export const dynamic = 'force-dynamic';

/** El día del evento: equipo, novios o planner marcan quién llegó. */
export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole('admin', 'staff', 'client');
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();
  const c = event.content as unknown as EventContent;
  const guests = await checkinSnapshot(id);
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <SessionBar me={me} />
      <main className="mx-auto max-w-lg px-4 py-6">
        <a href={me.role === 'client' ? `/panel/${id}` : `/admin/events/${id}`} className="text-xs uppercase tracking-[0.2em] text-stone-500 underline underline-offset-4">← {eventNames(c.couple)}</a>
        <h1 className="mb-4 mt-1 font-serif text-3xl">Check-in</h1>
        <CheckinScreen eventId={id} slug={event.slug} initial={guests} />
      </main>
    </div>
  );
}
