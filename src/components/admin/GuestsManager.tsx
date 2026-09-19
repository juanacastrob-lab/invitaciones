'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { addGuest, updateGuest, deleteGuest, regenerateToken, importGuests } from '@/actions/admin-guests';
import type { ActionResult } from '@/schemas/admin';
import type { GuestRow } from '@/lib/admin/queries';
import { Button, Badge, Field, Input, Select, Notice, inputClass } from '@/components/ui';
import { GUEST_STATUS_TONE } from '@/lib/admin/labels';
import { CopyButton } from '@/components/admin/EventTools';

function GuestForm({ eventId, guest, onDone }: { eventId: string; guest?: GuestRow; onDone?: () => void }) {
  const t = useTranslations('guests');
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const values = {
      displayName: f.get('displayName'), passes: f.get('passes'), phone: f.get('phone') || '',
      email: f.get('email') || '', language: f.get('language'), groupTag: f.get('groupTag') || '', tableNo: f.get('tableNo') || '',
    };
    start(async () => {
      const r = guest ? await updateGuest(eventId, guest.id, values) : await addGuest(eventId, values);
      setResult(r);
      if (r.ok) { if (!guest) form.reset(); onDone?.(); }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[2fr_0.6fr_1.2fr_1.4fr_0.8fr_1fr_0.6fr_auto] sm:items-end">
      <Field label={t('form.name')}><Input name="displayName" defaultValue={guest?.display_name} required placeholder={t('form.namePlaceholder')} /></Field>
      <Field label={t('form.passes')}><Input name="passes" type="number" min={1} max={30} defaultValue={guest?.passes ?? 2} required /></Field>
      <Field label={t('form.phone')}><Input name="phone" type="tel" defaultValue={guest?.phone ?? ''} placeholder="55 1234 5678" /></Field>
      <Field label={t('form.email')}><Input name="email" type="email" defaultValue={guest?.email ?? ''} /></Field>
      <Field label={t('form.language')}><Select name="language" defaultValue={guest?.language ?? 'es'}><option value="es">ES</option><option value="en">EN</option></Select></Field>
      <Field label={t('form.group')}><Input name="groupTag" defaultValue={guest?.group_tag ?? ''} placeholder={t('form.groupPlaceholder')} /></Field>
      <Field label={t('form.table')}><Input name="tableNo" defaultValue={guest?.table_no ?? ''} /></Field>
      <Button type="submit" disabled={pending}>{pending ? '…' : guest ? t('form.save') : t('form.add')}</Button>
      {result ? <div className="sm:col-span-full"><Notice kind={result.ok ? 'ok' : 'error'}>{result.ok ? result.message : result.error}</Notice></div> : null}
    </form>
  );
}

export function GuestsManager({ eventId, slug, siteUrl, guests, templateHref }: { eventId: string; slug: string; siteUrl: string; guests: GuestRow[]; templateHref: string }) {
  const t = useTranslations('guests');
  const [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<ActionResult<{ inserted: number; errors: string[] }> | null>(null);

  const visible = guests.filter((g) => {
    const q = filter.trim().toLowerCase();
    return !q || g.display_name.toLowerCase().includes(q) || (g.group_tag ?? '').toLowerCase().includes(q) || (g.phone ?? '').includes(q);
  });

  function importFile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => setNotice(await importGuests(eventId, fd)));
  }

  return (
    <div className="space-y-8">
      <section className="rounded-sm border border-stone-200 bg-white p-5">
        <h2 className="mb-4 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">{t('addTitle')}</h2>
        <GuestForm eventId={eventId} />
      </section>

      <section className="rounded-sm border border-stone-200 bg-white p-5">
        <h2 className="mb-2 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">{t('importTitle')}</h2>
        <p className="mb-3 text-xs text-stone-500">
          {t('importHelp')}{' '}
          <a className="underline" href={templateHref}>{t('importTemplate')}</a>
        </p>
        <form onSubmit={importFile} className="flex flex-wrap items-center gap-3">
          <input type="file" name="file" accept=".xlsx,.xls,.csv" required className="text-sm" />
          <Button type="submit" variant="secondary" disabled={pending}>{pending ? t('importing') : t('import')}</Button>
        </form>
        {notice ? (
          <div className="mt-3 space-y-1">
            {notice.ok ? (
              <Notice kind="ok">{t('imported', { count: notice.data?.inserted ?? 0 })}{notice.data?.errors.length ? ` ${t('importErrors', { count: notice.data.errors.length })}` : ''}</Notice>
            ) : <Notice kind="error">{notice.error}</Notice>}
            {notice.ok && notice.data?.errors.length ? (
              <ul className="ml-4 list-disc text-xs text-red-700">{notice.data.errors.slice(0, 30).map((e) => <li key={e}>{e}</li>)}</ul>
            ) : null}
          </div>
        ) : null}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <input className={`${inputClass} max-w-xs`} placeholder={t('search')} value={filter} onChange={(e) => setFilter(e.target.value)} />
          <p className="text-xs text-stone-500">{t('count', { visible: visible.length, total: guests.length })}</p>
        </div>

        <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
          {visible.map((g) => (
            <li key={g.id} className="p-4">
              {editing === g.id ? (
                <div className="space-y-2">
                  <GuestForm eventId={eventId} guest={g} onDone={() => setEditing(null)} />
                  <Button variant="ghost" onClick={() => setEditing(null)}>{t('cancel')}</Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {g.display_name}
                      <span className="ml-2 text-xs text-stone-500">{t('passes', { count: g.passes })}</span>
                      <span className="ml-2"><Badge tone={GUEST_STATUS_TONE[g.status]}>{t(`status.${g.status}`)}{g.status === 'confirmed' ? ` · ${g.confirmed_count}` : ''}</Badge></span>
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {[g.phone, g.email, g.language.toUpperCase(), g.group_tag, g.table_no ? t('tableNo', { table: g.table_no }) : null].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {g.sent_at ? t('sent') : t('notSent')}{g.opened_at ? ` · ${t('opened')}` : ''}{g.reminder_count ? ` · ${t('reminders', { count: g.reminder_count })}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <CopyButton value={`${siteUrl}/i/${slug}/${g.token}`} label={t('copyLink')} />
                    <Button variant="ghost" onClick={() => setEditing(g.id)}>{t('edit')}</Button>
                    <Button variant="ghost" onClick={() => { if (confirm(t('newLinkConfirm'))) start(async () => setNotice(await regenerateToken(eventId, g.id) as ActionResult<never>)); }}>{t('newLink')}</Button>
                    <Button variant="ghost" className="text-red-700" onClick={() => { if (confirm(t('deleteConfirm', { name: g.display_name }))) start(async () => setNotice(await deleteGuest(eventId, g.id) as ActionResult<never>)); }}>{t('delete')}</Button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {!visible.length ? <li className="p-6 text-center text-sm text-stone-500">{t('empty')}</li> : null}
        </ul>
      </section>
    </div>
  );
}
