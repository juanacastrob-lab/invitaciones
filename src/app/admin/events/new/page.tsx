import { requireRole } from '@/lib/auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { EventBasicsForm } from '@/components/admin/EventBasicsForm';
import { listPricing } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

export default async function NewEventPage() {
  const me = await requireRole('admin', 'staff');
  const { packages } = await listPricing();
  return (
    <AdminShell me={me} title="Nuevo evento" current="/admin/events">
      <p className="mb-6 text-sm text-stone-500">Se crea en borrador, a partir de la plantilla Aurora. Después se ajusta el contenido y se agregan invitados.</p>
      <div className="rounded-sm border border-stone-200 bg-white p-5">
        <EventBasicsForm initial={{ slug: '', type: 'boda', packageCode: '', template: 'aurora', partnerA: '', partnerB: '', startsAt: '', timezone: 'America/Mexico_City', country: 'MX', languages: ['es'], defaultLanguage: 'es', rsvpDeadline: '', allowPublicRsvp: false, showPrivateGifts: true }} packages={packages.filter((p) => p.active)} />
      </div>
    </AdminShell>
  );
}
