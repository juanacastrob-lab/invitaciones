'use client';

import { useMemo, useState, useTransition } from 'react';
import { markSent } from '@/actions/admin-guests';
import type { GuestRow } from '@/lib/admin/queries';
import { buildGuestMessage, guestLink, guestWhatsappUrl } from '@/lib/admin/whatsapp';
import { Button, Badge, Select, Textarea } from '@/components/ui';
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
export function SendQueue({ eventId, slug, siteUrl, couple, startsAt, timezone, guests, templates }: {
  eventId: string; slug: string; siteUrl: string; couple: string; startsAt: string; timezone: string;
  guests: GuestRow[];
  templates: { key: string; language: string; body: string }[];
}) {
  const [filter, setFilter] = useState<Filter>('unsent');
  const [templateKey, setTemplateKey] = useState('invite');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

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
