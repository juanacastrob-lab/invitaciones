import { notFound } from 'next/navigation';
import { eventNames } from '@/lib/event-types';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { requireRole } from '@/lib/auth';
import { getEvent } from '@/lib/admin/queries';
import { AdminShell } from '@/components/admin/AdminShell';
import { EventTabs } from '@/components/admin/EventTabs';
import { ContentEditor } from '@/components/editor/ContentEditor';
import { JsonEditor } from '@/components/admin/EventTools';
import type { Locale } from '@/lib/config';
import type { EventContent } from '@/schemas/event-content';

export const dynamic = 'force-dynamic';

export default async function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole('admin', 'staff');
  const { id } = await params;
  const [event, messages] = await Promise.all([getEvent(id), getMessages({ locale: 'es' })]);
  if (!event) notFound();
  const c = event.content as unknown as EventContent;
  return (
    <AdminShell me={me} title={eventNames(c.couple)} current="/admin/events">
      <EventTabs id={id} current="contenido" />
      <div className="mx-auto max-w-2xl">
        <NextIntlClientProvider locale="es" messages={{ editor: messages.editor }}>
          <ContentEditor eventId={id} content={c} languages={event.languages as Locale[]} previewHref={`/i/${event.slug}?preview=${event.preview_key}`} />
        </NextIntlClientProvider>
        {me.role === 'admin' ? (
          <details className="mt-8 rounded-sm border border-stone-200 bg-white p-4">
            <summary className="cursor-pointer text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">JSON avanzado</summary>
            <p className="my-3 text-xs text-stone-500">Para lo que el formulario todavía no cubre. Se valida igual al guardar.</p>
            <JsonEditor eventId={id} json={JSON.stringify(c, null, 2)} />
          </details>
        ) : null}
      </div>
    </AdminShell>
  );
}
