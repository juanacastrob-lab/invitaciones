'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { submitRsvp, submitRsvpExtra } from '@/actions/rsvp';
import type { RsvpErrorCode, RsvpResult } from '@/schemas/rsvp';
import type { Locale } from '@/lib/config';

export interface RsvpFormGuest {
  display_name: string;
  passes: number;
  response: {
    attending: boolean;
    count: number;
    attendee_names: string[];
    menu_choices: Record<string, string>;
    dietary: string | null;
    song: string | null;
    message: string | null;
    answers?: Record<string, string>;
    children_count?: number;
  } | null;
}

export interface RsvpFormConfig {
  askMenu: boolean;
  /** Ya en el idioma del invitado: el cliente no traduce, solo pinta. */
  menuOptions: { id: string; label: string }[];
  askDietary: boolean;
  askSong: boolean;
  askMessage: boolean;
  askChildren?: boolean;
  /** Ya en el idioma del invitado. */
  questions?: { id: string; label: string; type: 'text' | 'yesno' | 'choice'; options: string[] }[];
}

interface Props {
  slug: string;
  token: string;
  guest: RsvpFormGuest;
  config: RsvpFormConfig;
  locale: Locale;
  closed: boolean;
  privacyHref: string;
  /** En /dev/preview no hay base: simula el guardado. */
  previewMode?: boolean;
}

const field =
  'w-full rounded-sm border border-[var(--line)] bg-[var(--accent-soft)]/70 px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]/70 focus:border-[var(--accent)] focus:outline-none';

const label = 'mb-1.5 block text-[0.7rem] uppercase tracking-[0.2em] text-[var(--muted)]';

/**
 * El formulario de confirmar.
 *
 * Lo que aquí se valida es solo comodidad para el invitado (no dejarlo elegir
 * 6 personas con 4 pases). La validación que manda es la de la base.
 */
export function RsvpForm({ slug, token, guest, config, locale, closed, privacyHref, previewMode }: Props) {
  const t = useTranslations('invitation.rsvp');
  const tBanner = useTranslations('invitation.guestBanner');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const prev = guest.response;
  const [mode, setMode] = useState<'summary' | 'form' | 'done'>(prev ? 'summary' : 'form');
  const [done, setDone] = useState<{ attending: boolean; count: number } | null>(null);

  const [attending, setAttending] = useState<boolean | null>(prev?.attending ?? null);
  const [count, setCount] = useState(prev?.count && prev.count > 0 ? prev.count : Math.min(guest.passes, 1));
  const [names, setNames] = useState<string[]>(prev?.attendee_names ?? []);
  const [menu, setMenu] = useState<Record<string, string>>(prev?.menu_choices ?? {});
  const [dietary, setDietary] = useState(prev?.dietary ?? '');
  const [song, setSong] = useState(prev?.song ?? '');
  const [message, setMessage] = useState(prev?.message ?? '');
  const [children, setChildren] = useState(prev?.children_count ?? 0);
  const [answers, setAnswers] = useState<Record<string, string>>(prev?.answers ?? {});
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<{ code: RsvpErrorCode; passes?: number } | null>(null);

  const passesOptions = Array.from({ length: guest.passes }, (_, i) => i + 1);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const hasExtras = Boolean((attending && (count > 1 || config.askMenu || config.askChildren || config.askDietary || config.askSong || config.questions?.length)) || config.askMessage);
  const menuSelect = (i: number) => (
    <select className={`${field} mt-1.5`} value={menu[String(i)] ?? ''} onChange={(e) => setMenu((m) => ({ ...m, [String(i)]: e.target.value }))} aria-label={t('menuFor', { name: nameAt(i) || `${i + 1}` })}>
      <option value="">{t('choose')} · {t('menu')}</option>
      {config.menuOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
    </select>
  );

  function nameAt(i: number) {
    return names[i] ?? '';
  }

  function setNameAt(i: number, value: string) {
    setNames((current) => {
      const next = [...current];
      next[i] = value;
      return next.slice(0, count);
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (attending === null) return;
    setError(null);

    const trimmedNames = names.slice(0, count).map((n) => n.trim()).filter(Boolean);
    const menuChoices: Record<string, string> = {};
    if (config.askMenu && attending) {
      for (let i = 0; i < count; i++) {
        const key = trimmedNames[i] || `${i + 1}`;
        if (menu[String(i)]) menuChoices[key] = menu[String(i)];
      }
    }

    const payload = {
      attending,
      count: attending ? count : 0,
      attendeeNames: attending ? trimmedNames : [],
      menuChoices,
      dietary: attending && config.askDietary ? dietary : undefined,
      song: attending && config.askSong ? song : undefined,
      message: config.askMessage ? message : undefined,
      locale,
      consent,
    };

    startTransition(async () => {
      let result: RsvpResult;
      if (previewMode) {
        await new Promise((r) => setTimeout(r, 400));
        result = consent
          ? { ok: true, attending, count: payload.count, passes: guest.passes }
          : { ok: false, error: 'consent_required' };
      } else {
        result = await submitRsvp(slug, token, payload);
        if (result.ok && attending && (config.askChildren || config.questions?.length)) {
          await submitRsvpExtra(slug, token, { answers, children: Math.min(children, payload.count) });
        }
      }

      if (!result.ok) {
        setError({ code: result.error, passes: result.passes });
        return;
      }

      setDone({ attending: result.attending, count: result.count });
      setMode('done');
      if (!previewMode) router.refresh();
    });
  }

  // ------------------------------------------------------------ ya respondió
  if (mode === 'summary' && prev) {
    return (
      <div className="rounded-sm border border-[var(--line)] p-6 text-center">
        <p className="text-[0.7rem] uppercase tracking-[0.25em] text-[var(--muted)]">{t('yourAnswer')}</p>
        <p className="mt-3 font-serif text-2xl text-[var(--ink)]">
          {prev.attending ? t('attending') : t('notAttending')}
        </p>
        {prev.attending ? (
          <p className="mt-1 text-sm text-[var(--muted)]">{t('peopleConfirmed', { count: prev.count })}</p>
        ) : null}
        {prev.attending && prev.attendee_names.length ? (
          <p className="mt-2 text-xs text-[var(--muted)]">{prev.attendee_names.join(' · ')}</p>
        ) : null}

        {closed ? (
          <p className="mt-5 text-xs leading-relaxed text-[var(--muted)]">{t('closed')}</p>
        ) : (
          <button
            type="button"
            onClick={() => setMode('form')}
            className="mt-5 rounded-full border border-[var(--line)] px-5 py-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            {t('change')}
          </button>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------ gracias
  if (mode === 'done' && done) {
    return (
      <div className="rounded-sm bg-[var(--accent-soft)] p-6 text-center" role="status">
        <p className="text-[0.7rem] uppercase tracking-[0.25em] text-[var(--accent)]">{t('saved')}</p>
        <p className="mt-3 font-serif text-2xl text-[var(--ink)]">
          {done.attending ? t('thanksYes') : t('thanksNo')}
        </p>
        {done.attending ? (
          <p className="mt-1 text-sm text-[var(--muted)]">{t('peopleConfirmed', { count: done.count })}</p>
        ) : null}
        <button
          type="button"
          onClick={() => setMode('form')}
          className="mt-5 text-xs uppercase tracking-[0.2em] text-[var(--muted)] underline underline-offset-4"
        >
          {t('change')}
        </button>
      </div>
    );
  }

  // --------------------------------------------------------------- cerrado
  if (closed) {
    return (
      <div className="rounded-sm bg-[var(--accent-soft)] p-6 text-center">
        <p className="text-sm leading-relaxed text-[var(--muted)]">{t('closed')}</p>
      </div>
    );
  }

  // ------------------------------------------------------------- formulario
  return (
    <form onSubmit={submit} className="rounded-sm border border-[var(--line)] p-5" noValidate>
      <p className="text-center font-serif text-2xl text-[var(--ink)]">{guest.display_name}</p>
      <p className="mt-1 text-center text-xs uppercase tracking-[0.2em] text-[var(--accent)]">
        {tBanner('passes', { count: guest.passes })}
      </p>

      <fieldset className="mt-6">
        <legend className={label}>{t('question')}</legend>
        <div className="grid grid-cols-2 gap-2">
          {([true, false] as const).map((value) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => setAttending(value)}
              aria-pressed={attending === value}
              className={`rounded-sm border px-3 py-3 text-sm transition-colors ${
                attending === value
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]'
                  : 'border-[var(--line)] text-[var(--muted)]'
              }`}
            >
              {value ? t('yes') : t('no')}
            </button>
          ))}
        </div>
      </fieldset>

      {attending && guest.passes > 1 ? (
        <div className="mt-6">
          <label className={label} htmlFor="rsvp-count">
            {t('howMany')} <span className="normal-case tracking-normal">· {t('ofPasses', { passes: guest.passes })}</span>
          </label>
          <div className="flex gap-2">
            {passesOptions.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                aria-pressed={count === n}
                className={`h-11 flex-1 rounded-sm border font-serif text-lg transition-colors ${
                  count === n
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]'
                    : 'border-[var(--line)] text-[var(--muted)]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Todo lo demás es opcional y va plegado: confirmar son dos toques. */}
      {attending !== null && hasExtras ? (
        <details className="mt-6 rounded-sm border border-[var(--line)]" open={extrasOpen} onToggle={(e) => setExtrasOpen((e.target as HTMLDetailsElement).open)}>
          <summary className="cursor-pointer list-none px-4 py-3 text-[0.7rem] uppercase tracking-[0.2em] text-[var(--muted)]">
            + {t('optional')}
          </summary>
          <div className="space-y-5 px-4 pb-4">
            {attending && count > 1 ? (
              <div>
                <p className={label}>{t('names')} <span className="normal-case tracking-normal">· {t('optionalShort')}</span></p>
                <div className="space-y-3">
                  {Array.from({ length: count }, (_, i) => (
                    <div key={i}>
                      <input className={field} placeholder={`${t('namePlaceholder')} ${i + 1}`} value={nameAt(i)} onChange={(e) => setNameAt(i, e.target.value)} autoComplete="off" maxLength={80} />
                      {config.askMenu ? menuSelect(i) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : attending && config.askMenu ? (
              <div>
                <p className={label}>{t('menu')} <span className="normal-case tracking-normal">· {t('optionalShort')}</span></p>
                {menuSelect(0)}
              </div>
            ) : null}

            {attending && config.askChildren ? (
              <div>
                <label className={label} htmlFor="children">{t('children')}</label>
                <select id="children" className={field} value={children} onChange={(e) => setChildren(Number(e.target.value))}>
                  {Array.from({ length: count + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            ) : null}

            {attending ? (config.questions ?? []).map((q) => (
              <div key={q.id}>
                <label className={label} htmlFor={`q-${q.id}`}>{q.label}</label>
                {q.type === 'text' ? (
                  <input id={`q-${q.id}`} className={field} maxLength={300} value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                ) : (
                  <select id={`q-${q.id}`} className={field} value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}>
                    <option value="">—</option>
                    {(q.type === 'yesno' ? [t('yes'), t('no')] : q.options).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
              </div>
            )) : null}

            {attending && config.askDietary ? (
              <div>
                <label className={label} htmlFor="rsvp-dietary">{t('dietary')}</label>
                <input id="rsvp-dietary" className={field} placeholder={t('dietaryPlaceholder')} value={dietary} onChange={(e) => setDietary(e.target.value)} maxLength={500} />
              </div>
            ) : null}

            {attending && config.askSong ? (
              <div>
                <label className={label} htmlFor="rsvp-song">{t('song')}</label>
                <input id="rsvp-song" className={field} placeholder={t('songPlaceholder')} value={song} onChange={(e) => setSong(e.target.value)} maxLength={200} />
              </div>
            ) : null}

            {config.askMessage ? (
              <div>
                <label className={label} htmlFor="rsvp-message">{t('message')}</label>
                <textarea id="rsvp-message" className={`${field} min-h-20 resize-y`} placeholder={t('messagePlaceholder')} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
              </div>
            ) : null}
          </div>
        </details>
      ) : null}

      {attending !== null ? (
        <>
          <label className="mt-6 flex items-start gap-3 rounded-sm bg-[var(--accent-soft)]/60 p-3 text-xs leading-relaxed text-[var(--ink)]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <span>
              {t.rich('consent', {
                link: (chunks) => (
                  <a href={privacyHref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    {chunks}
                  </a>
                ),
              })}
            </span>
          </label>

          {error ? (
            <p className="mt-4 rounded-sm bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800" role="alert">
              {t(`errors.${error.code}`, { passes: error.passes ?? guest.passes })}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-6 w-full rounded-full bg-[var(--ink)] px-5 py-3.5 text-xs uppercase tracking-[0.25em] text-[var(--paper)] transition-opacity disabled:opacity-60"
          >
            {pending ? t('sending') : t('submit')}
          </button>
        </>
      ) : null}
    </form>
  );
}
