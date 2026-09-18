import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { ContentEditor } from '@/components/editor/ContentEditor';
import { demoEventContent } from '@/demo/demo-event';

export const dynamic = 'force-dynamic';

/** Editor con el contenido del demo, para revisar el diseño. No existe en producción. */
export default async function DevEditor({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { lang } = await searchParams;
  const locale = lang === 'en' ? 'en' : 'es';
  const messages = await getMessages({ locale });
  return (
    <main className="mx-auto max-w-2xl bg-stone-50 px-4 py-8">
      <NextIntlClientProvider locale={locale} messages={{ editor: messages.editor }}>
        <ContentEditor eventId="demo" content={demoEventContent} languages={['es', 'en']} previewHref="/dev/preview" />
      </NextIntlClientProvider>
    </main>
  );
}
