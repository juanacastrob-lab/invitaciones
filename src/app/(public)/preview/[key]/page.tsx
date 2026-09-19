import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadDraft } from '@/actions/draft';
import { draftToContent } from '@/lib/drafts';
import { AuroraTemplate } from '@/templates/aurora';
import type { Invitation } from '@/lib/invitations';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Vista previa', robots: { index: false, follow: false } };

/**
 * Vista previa de los paquetes web antes de pagar: la invitación real con lo
 * que el cliente armó, en un link temporal (48 h), sin RSVP, sin links de
 * invitados y sin tarjeta para compartir. No hay nada que llevarse.
 */
export default async function DraftPreview({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { key } = await params;
  const { lang } = await searchParams;
  const draft = await loadDraft(key);
  if (!draft) notFound();
  const locale = lang === 'en' ? 'en' : draft.locale;
  const content = draftToContent(draft.data);
  const invitation: Invitation = {
    access: 'public',
    token_valid: false,
    event: {
      slug: `preview-${key}`, type: draft.event_type, template: draft.template, languages: [locale], default_language: locale, timezone: 'America/Mexico_City',
      status: 'borrador', rsvp_deadline: null, checkin_enabled: false, content,
    },
    guest: null,
  } as unknown as Invitation;
  const es = locale !== 'en';
  return (
    <div>
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 bg-stone-900 px-4 py-2 text-xs text-white">
        <span>{es ? 'Vista previa · así se vería tu invitación. Se activa y recibe confirmaciones cuando la pagas.' : 'Preview · this is how your invitation would look. It goes live and takes RSVPs once you pay.'}</span>
        <a href={`/comprar?d=${key}${es ? '' : '&lang=en'}`} className="rounded-full bg-white px-3 py-1 text-stone-900">{es ? 'Volver a la tienda' : 'Back to the store'}</a>
      </div>
      <AuroraTemplate invitation={invitation} locale={locale} path={`/preview/${key}`} previewMode />
    </div>
  );
}
