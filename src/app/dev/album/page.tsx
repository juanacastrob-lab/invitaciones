import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { AlbumView } from '@/components/album/AlbumView';
import { TEMPLATES, templateCssVars } from '@/templates/registry';

export const dynamic = 'force-dynamic';

/** Álbum con fotos de mentira, para revisar el diseño. No existe en producción. */
export default async function DevAlbum() {
  if (process.env.NODE_ENV === 'production') notFound();
  const messages = await getMessages({ locale: 'es' });
  const photos = ['/demo/galeria-1.webp', '/demo/galeria-2.webp', '/demo/galeria-3.webp', '/demo/galeria-4.webp', '/demo/historia.webp'].map((url, i) => ({ id: String(i), url, uploader: i % 2 ? 'Tía Lupe' : null, caption: null }));
  return (
    <div style={templateCssVars(TEMPLATES.aurora)} className="min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-6 text-center font-serif text-3xl">Fotos del evento</h1>
        <NextIntlClientProvider locale="es" messages={{ album: messages.album }}>
          <AlbumView slug="juan-y-ana" initial={photos} slideshow={false} mediaBase="" />
        </NextIntlClientProvider>
      </main>
    </div>
  );
}
