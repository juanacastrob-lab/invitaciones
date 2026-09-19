import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth';
import { getEvent } from '@/lib/admin/queries';
import { supabaseServer } from '@/lib/supabase/server';
import { SessionBar } from '@/components/auth/SessionBar';
import { AlbumModeration } from '@/components/album/AlbumModeration';
import { isLocale, DEFAULT_LOCALE } from '@/lib/config';
import { getPublicEnv, getSiteUrl } from '@/lib/env';
import { publicMediaUrl } from '@/lib/media';
import { eventNames } from '@/lib/event-types';
import type { EventContent } from '@/schemas/event-content';

export const dynamic = 'force-dynamic';

/** Los novios (y el equipo) ven todas las fotos del álbum, borran las que no van y descargan el QR. */
export default async function PanelAlbumPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const me = await requireRole('client', 'staff', 'admin');
  const { id } = await params;
  const { lang } = await searchParams;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const [t, event] = await Promise.all([getTranslations({ locale, namespace: 'album' }), getEvent(id)]);
  if (!event) notFound();
  const c = event.content as unknown as EventContent;
  const supabase = await supabaseServer();
  const { data } = await supabase.from('event_photos').select('id, path, uploader_name, caption, created_at').eq('event_id', id).order('created_at', { ascending: false });
  const base = getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const photos = (data ?? []).map((p) => ({ id: p.id, url: publicMediaUrl(base, p.path), uploader: p.uploader_name as string | null, created_at: p.created_at as string }));
  const site = getSiteUrl() ?? '';
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <SessionBar me={me} locale={locale} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <a href={`/panel/${id}${lang ? `?lang=${lang}` : ''}`} className="text-xs uppercase tracking-[0.2em] text-stone-500 underline underline-offset-4">← {eventNames(c.couple)}</a>
        <h1 className="mb-2 mt-2 font-serif text-3xl">{t('title')}</h1>
        {c.album?.enabled ? (
          <p className="mb-6 text-sm text-stone-600">{t('panelHint')} <a className="underline" href={`${site}/i/${event.slug}/fotos`} target="_blank">{site}/i/{event.slug}/fotos</a> · <a className="underline" href={`/i/${event.slug}/fotos/qr.png`} target="_blank">{t('qr')}</a> · <a className="underline" href={`/i/${event.slug}/fotos?slideshow=1`} target="_blank">{t('slideshow')}</a></p>
        ) : (
          <p className="mb-6 text-sm text-amber-800">{t('panelOff')}</p>
        )}
        <AlbumModeration eventId={id} photos={photos} />
      </main>
    </div>
  );
}
