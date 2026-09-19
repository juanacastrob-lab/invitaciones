import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMessages, getTranslations } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { getAlbum } from '@/lib/invitations';
import { resolveLocale } from '@/lib/locale';
import { pickText } from '@/schemas/event-content';
import { eventNames } from '@/lib/event-types';
import { getPublicEnv } from '@/lib/env';
import { publicMediaUrl } from '@/lib/media';
import { resolveTemplate, templateCssVars } from '@/templates/registry';
import { AlbumView } from '@/components/album/AlbumView';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;
type Search = Promise<{ lang?: string; slideshow?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const album = await getAlbum(slug);
  if (!album) return { title: 'No encontrado' };
  return { title: `${eventNames(album.couple)} · Fotos`, robots: { index: false } };
}

/** Álbum público del evento: cualquiera con el link (o el QR de las mesas) sube y ve fotos. */
export default async function AlbumPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug } = await params;
  const { lang, slideshow } = await searchParams;
  const album = await getAlbum(slug);
  if (!album) notFound();
  const locale = resolveLocale({ languages: album.languages, defaultLanguage: album.default_language, requested: lang });
  const [t, messages] = await Promise.all([getTranslations({ locale, namespace: 'album' }), getMessages({ locale })]);
  const theme = resolveTemplate(album.template);
  const base = getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const photos = album.photos.map((p) => ({ id: p.id, url: publicMediaUrl(base, p.path), uploader: p.uploader, caption: p.caption }));
  const heading = theme.heading === 'sans' ? 'font-sans font-light' : 'font-serif';

  return (
    <div style={templateCssVars(theme)} className="min-h-dvh bg-[var(--paper)] font-sans text-[var(--ink)] antialiased">
      <main className={`mx-auto w-full max-w-2xl px-4 py-10 ${slideshow === '1' ? '' : ''}`}>
        {slideshow !== '1' ? (
          <header className="mb-6 text-center">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-[var(--muted)]">{eventNames(album.couple)}</p>
            <h1 className={`mt-2 ${heading} text-3xl`}>{pickText(album.title ?? undefined, locale) ?? t('title')}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{pickText(album.note ?? undefined, locale) ?? t('note')}</p>
          </header>
        ) : null}
        <NextIntlClientProvider locale={locale} messages={{ album: messages.album }}>
          <AlbumView slug={slug} initial={photos} slideshow={slideshow === '1'} mediaBase={`${base}/storage/v1/object/public/event-media`} />
        </NextIntlClientProvider>
        {slideshow !== '1' ? <p className="mt-8 text-center text-xs"><a href={`/i/${slug}`} className="text-[var(--muted)] underline underline-offset-4">{t('back')}</a></p> : null}
      </main>
    </div>
  );
}
