'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabaseBrowser } from '@/lib/supabase/browser';
import type { AuthProvider } from '@/lib/config';

const btn =
  'flex w-full items-center justify-center gap-3 rounded-full border px-5 py-3 text-sm transition-colors';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.8c2.3-2.1 3.6-5.1 3.6-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-3c-1.1.7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1C3.3 21.3 7.3 24 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.3C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4l4-3.1z" />
      <path fill="#EA4335" d="M12 4.7c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.3 6.6l4 3.1c.9-2.9 3.6-5 6.7-5z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.8 1.3 10.3.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.4-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1.1-2.8-4.2zM13.9 4.9c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z" />
    </svg>
  );
}

/**
 * Login para el equipo y los novios. Los invitados nunca pasan por aquí:
 * ellos entran con su link personal, sin cuenta.
 */
export function LoginForm({ providers, next }: { providers: AuthProvider[]; next: string }) {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  function callbackUrl() {
    const url = new URL('/auth/callback', window.location.origin);
    url.searchParams.set('next', next);
    return url.toString();
  }

  async function withProvider(provider: AuthProvider) {
    setState('idle');
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl() },
    });
    if (error) setState('error');
  }

  async function withEmail(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });
    setState(error ? 'error' : 'sent');
  }

  return (
    <div className="space-y-3">
      {providers.includes('google') ? (
        <button type="button" onClick={() => withProvider('google')} className={`${btn} border-stone-300 bg-white text-stone-800 hover:border-stone-400`}>
          <GoogleIcon /> {t('google')}
        </button>
      ) : null}

      {providers.includes('apple') ? (
        <button type="button" onClick={() => withProvider('apple')} className={`${btn} border-stone-900 bg-stone-900 text-white hover:bg-stone-800`}>
          <AppleIcon /> {t('apple')}
        </button>
      ) : null}

      {providers.length ? (
        <p className="py-2 text-center text-[0.7rem] uppercase tracking-[0.25em] text-stone-400">{t('or')}</p>
      ) : null}

      {state === 'sent' ? (
        <p className="rounded-sm bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">{t('sent')}</p>
      ) : (
        <form onSubmit={withEmail} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[0.7rem] uppercase tracking-[0.2em] text-stone-500">{t('emailLabel')}</span>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              className="w-full rounded-sm border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-stone-500 focus:outline-none"
            />
          </label>
          <button type="submit" disabled={state === 'sending'} className={`${btn} border-stone-900 bg-stone-900 text-white disabled:opacity-60`}>
            {state === 'sending' ? t('sending') : t('sendLink')}
          </button>
        </form>
      )}

      {state === 'error' ? (
        <p className="rounded-sm bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{t('error')}</p>
      ) : null}
    </div>
  );
}
