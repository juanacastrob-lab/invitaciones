import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { APP_NAME, enabledAuthProviders } from '@/lib/config';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = { title: `Entrar · ${APP_NAME}`, robots: { index: false } };

/** Solo se llega aquí sin sesión: el proxy manda a /admin a quien ya entró. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const t = await getTranslations('auth');

  // Solo rutas internas: nunca redirigir a un dominio ajeno después del login.
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/admin';

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-14">
      <a href="/"><img src="/brand/logo.png" alt={APP_NAME} className="w-44 mix-blend-multiply" /></a>
      <h1 className="mt-8 font-serif text-3xl text-stone-900">{t('title')}</h1>
      <p className="mt-1 text-sm text-stone-500">{t('subtitle')}</p>
      <div className="mt-8">
        <LoginForm providers={enabledAuthProviders()} next={safeNext} />
      </div>
    </main>
  );
}
