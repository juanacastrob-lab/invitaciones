import { getTranslations } from 'next-intl/server';
import { signOut } from '@/actions/auth';
import type { SessionProfile } from '@/lib/auth';
import { APP_NAME, type Locale } from '@/lib/config';

export async function SessionBar({ me, locale }: { me: SessionProfile; locale?: Locale }) {
  const t = locale ? await getTranslations({ locale, namespace: 'auth' }) : await getTranslations('auth');
  return (
    <header className="flex items-center justify-between border-b border-stone-200 px-6 py-3 text-sm">
      <div className="min-w-0">
        <span className="text-[0.65rem] uppercase tracking-[0.25em] text-stone-400">{APP_NAME}</span>
        <p className="truncate text-stone-800">
          {t('hello', { name: me.name ?? me.email ?? '' })}
          <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-[0.65rem] uppercase tracking-widest text-stone-500">
            {t(`roles.${me.role}`)}
          </span>
        </p>
      </div>
      <form action={signOut}>
        <button type="submit" className="text-xs uppercase tracking-[0.2em] text-stone-500 underline underline-offset-4">
          {t('signOut')}
        </button>
      </form>
    </header>
  );
}
