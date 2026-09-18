import { getTranslations } from 'next-intl/server';
import { APP_NAME } from '@/lib/config';

export default async function HomePage() {
  const t = await getTranslations('landing');

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-stone-400">{t('soon')}</p>

      <h1 className="mt-6 font-serif text-4xl text-stone-900">{APP_NAME}</h1>

      <p className="mt-3 text-sm uppercase tracking-widest text-stone-500">{t('tagline')}</p>

      <p className="mt-8 text-balance text-base leading-relaxed text-stone-600">
        {t('description')}
      </p>

      <div className="mt-10 h-px w-16 bg-stone-300" />
    </main>
  );
}
