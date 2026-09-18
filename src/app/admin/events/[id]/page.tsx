import { notFound } from 'next/navigation';
import { eventNames } from '@/lib/event-types';
import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth';
import { getEvent, listMembers } from '@/lib/admin/queries';
import { getSiteUrl } from '@/lib/env';
import { AdminShell } from '@/components/admin/AdminShell';
import { EventTabs } from '@/components/admin/EventTabs';
import { EventBasicsForm } from '@/components/admin/EventBasicsForm';
import { StatusButtons, DuplicateForm, DeleteButton, CopyButton } from '@/components/admin/EventTools';
import { Badge } from '@/components/ui';
import { MembersPanel } from '@/components/admin/MembersPanel';
import { STATUS_LABEL, STATUS_TONE } from '@/lib/admin/labels';
import type { EventContent } from '@/schemas/event-content';

export const dynamic = 'force-dynamic';

async function origin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  return host ? `${h.get('x-forwarded-proto') ?? 'https'}://${host}` : (getSiteUrl() ?? '');
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole('admin', 'staff');
  const { id } = await params;
  const [event, members] = await Promise.all([getEvent(id), listMembers(id)]);
  if (!event) notFound();
  const c = event.content as unknown as EventContent;
  const site = await origin();

  return (
    <AdminShell me={me} title={eventNames(c.couple)} current="/admin/events" actions={<Badge tone={STATUS_TONE[event.status]}>{STATUS_LABEL[event.status]}</Badge>}>
      <EventTabs id={id} current="datos" />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-sm border border-stone-200 bg-white p-5">
            <h2 className="mb-4 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Datos básicos</h2>
            <EventBasicsForm eventId={id} initial={{
              slug: event.slug, type: event.type, partnerA: c.couple.partnerA, partnerB: c.couple.partnerB ?? '', startsAt: c.startsAt,
              timezone: event.timezone, country: event.country, languages: event.languages, defaultLanguage: event.default_language,
              rsvpDeadline: event.rsvp_deadline ? event.rsvp_deadline.slice(0, 10) : '', allowPublicRsvp: event.allow_public_rsvp, showPrivateGifts: event.show_private_gifts,
            }} />
          </section>

          <section className="rounded-sm border border-stone-200 bg-white p-5">
            <h2 className="mb-1 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Contenido de la invitación</h2>
            <p className="mb-3 text-xs text-stone-500">Textos, fotos, itinerario, regalos, hospedaje, galería y preguntas, por secciones y en los idiomas del evento.</p>
            <a href={`/admin/events/${id}/content`} className="inline-flex items-center rounded-full bg-stone-900 px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-white">Editar contenido</a>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-sm border border-stone-200 bg-white p-5">
            <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Estado</h2>
            <StatusButtons eventId={id} status={event.status} />
          </section>

          <section className="rounded-sm border border-stone-200 bg-white p-5 text-sm">
            <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Links</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-stone-500">Vista previa (aunque esté en borrador)</dt>
                <dd className="flex items-center gap-1 break-all"><a className="underline" href={`/i/${event.slug}?preview=${event.preview_key}`} target="_blank">/i/{event.slug}?preview=…</a><CopyButton value={`${site}/i/${event.slug}?preview=${event.preview_key}`} /></dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Link general (solo si está publicado)</dt>
                <dd className="flex items-center gap-1 break-all"><a className="underline" href={`/i/${event.slug}`} target="_blank">/i/{event.slug}</a><CopyButton value={`${site}/i/${event.slug}`} /></dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Tarjeta de WhatsApp</dt>
                <dd><a className="underline" href={`/i/${event.slug}/opengraph-image`} target="_blank">ver imagen</a></dd>
              </div>
            </dl>
          </section>

          <section className="rounded-sm border border-stone-200 bg-white p-5">
            <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Resumen</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-stone-500">Invitados</dt><dd>{event.stats.guests}</dd>
              <dt className="text-stone-500">Pases</dt><dd>{event.stats.passes}</dd>
              <dt className="text-stone-500">Confirmados</dt><dd>{event.stats.confirmed_people} personas ({event.stats.confirmed} inv.)</dd>
              <dt className="text-stone-500">No asisten</dt><dd>{event.stats.declined}</dd>
              <dt className="text-stone-500">Pendientes</dt><dd>{event.stats.pending}</dd>
              <dt className="text-stone-500">Abrieron sin confirmar</dt><dd>{event.stats.opened_pending}</dd>
            </dl>
          </section>

          <section className="rounded-sm border border-stone-200 bg-white p-5">
            <h2 className="mb-1 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Novios con acceso al panel</h2>
            <p className="mb-3 text-xs text-stone-500">Entran en /panel con Google o con el link del correo y ven solo este evento.</p>
            <MembersPanel eventId={id} members={members} />
          </section>

          <section className="rounded-sm border border-stone-200 bg-white p-5">
            <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Duplicar</h2>
            <DuplicateForm eventId={id} suggested={`${event.slug}-copia`} />
          </section>

          {me.role === 'admin' ? (
            <section className="rounded-sm border border-red-100 bg-white p-5">
              <DeleteButton eventId={id} slug={event.slug} />
            </section>
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}
