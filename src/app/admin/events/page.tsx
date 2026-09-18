import { requireRole } from '@/lib/auth';
import { listEvents } from '@/lib/admin/queries';
import { AdminShell } from '@/components/admin/AdminShell';
import { Badge, LinkButton } from '@/components/ui';
import { STATUS_LABEL, STATUS_TONE } from '@/lib/admin/labels';
import type { EventContent } from '@/schemas/event-content';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const me = await requireRole('admin', 'staff');
  const events = await listEvents();

  return (
    <AdminShell me={me} title="Eventos" current="/admin/events" actions={<LinkButton href="/admin/events/new" variant="primary">Nuevo evento</LinkButton>}>
      <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
        {events.map((e) => {
          const c = e.content as unknown as EventContent;
          return (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <a href={`/admin/events/${e.id}`} className="font-medium hover:underline">{c.couple?.partnerA} &amp; {c.couple?.partnerB}</a>
                <p className="text-xs text-stone-500">/i/{e.slug} · {c.startsAt?.slice(0, 10)} · {e.languages.join('/')}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-stone-600">
                <span>{e.stats.guests} inv. · {e.stats.passes} pases</span>
                <span className="text-emerald-700">{e.stats.confirmed_people} confirmados</span>
                <span className="text-amber-700">{e.stats.pending} pendientes</span>
                <Badge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Badge>
              </div>
            </li>
          );
        })}
        {!events.length ? <li className="p-6 text-center text-sm text-stone-500">Todavía no hay eventos.</li> : null}
      </ul>
    </AdminShell>
  );
}
