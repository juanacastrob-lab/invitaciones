'use client';

import { useMemo, useState, useTransition } from 'react';
import { markSent } from '@/actions/admin-guests';
import { sendGuestEmails } from '@/actions/admin-email';
import type { GuestRow } from '@/lib/admin/queries';
import { buildGuestMessage, guestLink, guestWhatsappUrl } from '@/lib/admin/whatsapp';
import { Button, Badge, Notice, Select, Textarea } from '@/components/ui';
import type { Locale } from '@/lib/config';

type Filter = 'unsent' | 'pending' | 'opened' | 'confirmed' | 'all';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'unsent', label: 'Sin enviar' },
  { key: 'pending', label: 'Enviados sin confirmar' },
  { key: 'opened', label: 'Abrieron sin confirmar' },
  { key: 'confirmed', label: 'Ya respondieron' },
  { key: 'all', label: 'Todos' },
];

/**
 * La cola de la administrativa. Cada renglón abre WhatsApp con el mensaje y
 * el link personal ya escritos; al regresar, marca "enviado". Nada se manda
 * solo: el envío automático es Fase 3 (WhatsApp Cloud API).
 */
export function SendQueue({ eventId, slug, siteUrl, couple, startsAt, timezone, guests, templates, emailEnabled = false, published = true }: {
  eventId: string; slug: string; siteUrl: string; couple: string; startsAt: string; timezone: string;
  guests: GuestRow[];
  templates: { key: string; language: string; body: string }[];
  emailEnabled?: boolean;
  published?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>('unsent');
  const [templateKey, setTemplateKey] = useState('invite');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [mailing, setMailing] = useState<{ done: number; total: number; sent: number; failed: { name: string; error: string }[] } | null>(null);

  const keys = useMemo(() => [...new Set(templates.map((t) => t.key))], [templates]);
  const bodyFor = (lang: string) =>
    overrides[`${templateKey}:${lang}`] ?? templates.find((t) => t.key === templateKey && t.language === lang)?.body ?? templates.find((t) => t.key === templateKey)?.body ?? '';

  const visible = guests.filter((g) => {
    switch (filter) {
      case 'unsent': return !g.sent_at;
      case 'pending': return Boolean(g.sent_at) && g.status === 'pending';
      case 'opened': return g.status === 'pending' && Boolean(g.opened_at);
      case 'confirmed': return g.status !== 'pending';
      default: return true;
    }
  });

  const isReminder = templateKey !== 'invite';
  const withEmail = visible.filter((g) => g.email);

  /** Manda en tandas de 10: cada llamada al servidor dura pocos segundos. */
  async function mailList(targets: GuestRow[]) {
    if (!targets.length) return;
    if (!window.confirm(`¿Mandar "${templateKey === 'invite' ? 'Invitación' : 'Recordatorio'}" por correo a ${targets.length} invitado(s)?`)) return;
    const state = { done: 0, total: targets.length, sent: 0, failed: [] as { name: string; error: string }[] };
    setMailing({ ...state });
    for (let i = 0; i < targets.length; i += 10) {
      const chunk = targets.slice(i, i + 10);
      const r = await sendGuestEmails({ eventId, guestIds: chunk.map((g) => g.id), templateKey, bodies: { es: bodyFor('es'), en: bodyFor('en') }, siteUrl });
      if (r.ok && r.data) { state.sent += r.data.sent; state.failed.push(...r.data.failed); }
      else { state.failed.push(...chunk.map((g) => ({ name: g.display_name, error: r.ok ? 'sin respuesta' : r.error }))); }
      state.done += chunk.length;
      setMailing({ ...state });
      if (!r.ok) break;
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-sm border border-stone-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
          <div>
            <p className="mb-1 text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">Plantilla</p>
            <Select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
              {keys.map((k) => <option key={k} value={k}>{{ invite: 'Invitación', reminder_pending: 'Recordatorio: no ha confirmado', reminder_opened: 'Recordatorio: abrió sin confirmar' }[k] ?? k}</option>)}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(['es', 'en'] as const).map((lang) => (
              <div key={lang}>
                <p className="mb-1 text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">Mensaje {lang.toUpperCase()} <span className="normal-case tracking-normal text-stone-400">· {'{nombre} {pareja} {fecha} {link} {pases}'}</span></p>
                <Textarea value={bodyFor(lang)} onChange={(e) => setOverrides((o) => ({ ...o, [`${templateKey}:${lang}`]: e.target.value }))} className="min-h-32 text-xs" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-full border px-3 py-1.5 text-xs ${filter === f.key ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-stone-600'}`}>
            {f.label}
          </button>
        ))}
        <span className="self-center text-xs text-stone-500">{visible.length}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-sm border border-stone-200 bg-white p-3 text-xs text-stone-600">
        {emailEnabled ? (
          <>
            <Button variant="secondary" disabled={!withEmail.length || !published || Boolean(mailing && mailing.done < mailing.total)} onClick={() => mailList(withEmail)}>
              Mandar por correo a esta lista ({withEmail.length})
            </Button>
            <span>Solo a quienes tienen correo. Usa el mismo texto de arriba y marca enviado / recordado.</span>
          </>
        ) : (
          <span>Para mandar por correo, configura <code>RESEND_API_KEY</code> y <code>EMAIL_FROM</code> en Netlify (ver README).</span>
        )}
      </div>
      {mailing ? (
        <Notice kind={mailing.failed.length && mailing.done === mailing.total ? 'error' : 'ok'}>
          {mailing.done < mailing.total ? `Enviando… ${mailing.done} de ${mailing.total}` : `Listo: ${mailing.sent} enviados${mailing.failed.length ? `, ${mailing.failed.length} fallaron` : ''}.`}
          {mailing.failed.length ? <span className="block text-xs">{mailing.failed.map((f) => `${f.name}: ${f.error}`).join(' · ')}</span> : null}
        </Notice>
      ) : null}

      <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
        {visible.map((g) => {
          const locale: Locale = g.language === 'en' ? 'en' : 'es';
          const link = guestLink(siteUrl, slug, g.token);
          const message = buildGuestMessage({ template: bodyFor(locale), guestName: g.display_name, passes: g.passes, locale, couple, startsAt, timezone, link });
          return (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">{g.display_name} <span className="text-xs text-stone-500">· {g.passes} pases · {locale.toUpperCase()}</span></p>
                <p className="text-xs text-stone-500">{g.phone ?? <span className="text-red-600">sin teléfono</span>}{g.sent_at ? ' · enviado' : ''}{g.opened_at ? ' · abrió' : ''}{g.reminder_count ? ` · ${g.reminder_count} rec.` : ''}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={g.status === 'confirmed' ? 'green' : g.status === 'declined' ? 'red' : 'amber'}>{g.status}</Badge>
                {g.phone ? (
                  <a href={guestWhatsappUrl(g.phone, message)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full bg-[#25D366] px-4 py-2 text-xs font-medium text-white">
                    Abrir WhatsApp
                  </a>
                ) : (
                  <Button variant="secondary" onClick={() => navigator.clipboard.writeText(message)}>Copiar mensaje</Button>
                )}
                {emailEnabled && g.email ? <Button variant="secondary" disabled={!published} onClick={() => mailList([g])}>Correo</Button> : null}
                <Button variant="secondary" disabled={pending} onClick={() => start(async () => { await markSent(eventId, g.id, isReminder); })}>
                  {isReminder ? 'Marcar recordado' : 'Marcar enviado'}
                </Button>
              </div>
            </li>
          );
        })}
        {!visible.length ? <li className="p-6 text-center text-sm text-stone-500">Nadie en esta lista.</li> : null}
      </ul>
    </div>
  );
}
