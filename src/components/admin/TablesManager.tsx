'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { createTable, bulkCreateTables, updateTable, deleteTable, assignTable } from '@/actions/tables';
import type { GuestRow, TableRow } from '@/lib/admin/queries';
import type { ActionResult } from '@/schemas/admin';
import { Button, Input, Notice, inputClass, inputClassWith } from '@/components/ui';

/**
 * Acomodo de mesas. Lo usan el equipo (admin), los novios y el planner
 * (panel): mismo componente, misma lógica, la RLS decide el acceso.
 */
export function TablesManager({ eventId, tables, guests, exportHref }: { eventId: string; tables: TableRow[]; guests: GuestRow[]; exportHref: string }) {
  const t = useTranslations('tables');
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const assigned = guests.filter((g) => g.table_id).length;
  const visible = guests
    .filter((g) => !q.trim() || g.display_name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(Boolean(a.table_id)) - Number(Boolean(b.table_id)) || a.display_name.localeCompare(b.display_name));

  const run = (fn: () => Promise<ActionResult>) => start(async () => setResult(await fn()));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">{t('summary', { tables: tables.length, assigned, total: guests.length })}</p>
        <div className="flex gap-2">
          <a href={exportHref} className="rounded-full border border-stone-300 px-4 py-2 text-xs uppercase tracking-[0.18em] text-stone-700">{t('export')}</a>
          <button type="button" onClick={() => window.print()} className="rounded-full border border-stone-300 px-4 py-2 text-xs uppercase tracking-[0.18em] text-stone-700 print:hidden">{t('print')}</button>
        </div>
      </div>

      {result && !result.ok ? <Notice kind="error">{result.error}</Notice> : null}

      {/* ---------------------------------------------------------- mesas */}
      <section>
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">{t('title')}</h2>
        {!tables.length ? <p className="mb-4 text-sm text-stone-500">{t('noTables')}</p> : null}
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((tb) => {
            const over = tb.capacity !== null && tb.passes > tb.capacity;
            const pct = tb.capacity ? Math.min(100, Math.round((tb.passes / tb.capacity) * 100)) : 0;
            return (
              <li key={tb.table_id} className={`rounded-sm border bg-white p-3 ${over ? 'border-red-300' : 'border-stone-200'}`}>
                {editing === tb.table_id ? (
                  <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => updateTable(eventId, tb.table_id, { name: f.get('name'), capacity: f.get('capacity') || '' })); setEditing(null); }}>
                    <Input name="name" defaultValue={tb.name} required aria-label={t('name')} />
                    <div className="flex gap-2">
                      <Input name="capacity" type="number" min={1} max={100} defaultValue={tb.capacity ?? ''} placeholder={t('capacity')} className="w-28" />
                      <Button type="submit" variant="secondary" disabled={pending} className="flex-1">{t('save')}</Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between">
                      <p className="font-medium">{tb.name}</p>
                      <p className={`text-xs ${over ? 'text-red-700' : 'text-stone-500'}`}>{tb.passes}{tb.capacity ? ` ${t('of', { capacity: tb.capacity })}` : ''}{over ? ` · ${t('over')}` : ''}</p>
                    </div>
                    {tb.capacity ? <div className="mt-2 h-1 rounded-full bg-stone-100"><div className={`h-1 rounded-full ${over ? 'bg-red-500' : 'bg-[#7d8471]'}`} style={{ width: `${pct}%` }} /></div> : null}
                    <p className="mt-1 text-xs text-stone-500">{t('seats', { passes: tb.passes, confirmed: tb.confirmed_people })}</p>
                    <ul className="mt-2 space-y-0.5 text-xs text-stone-700">
                      {guests.filter((g) => g.table_id === tb.table_id).map((g) => <li key={g.id}>{g.display_name} <span className="text-stone-400">· {g.passes}</span></li>)}
                    </ul>
                    <div className="mt-2 flex gap-1 print:hidden">
                      <Button variant="ghost" onClick={() => setEditing(tb.table_id)}>{t('edit')}</Button>
                      <Button variant="ghost" className="text-red-700" disabled={pending} onClick={() => { if (confirm(t('deleteConfirm'))) run(() => deleteTable(eventId, tb.table_id)); }}>{t('delete')}</Button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 print:hidden">
          <form className="space-y-2 rounded-sm border border-stone-200 bg-white p-3" onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); run(() => createTable(eventId, { name: f.get('name'), capacity: f.get('capacity') || '' })); form.reset(); }}>
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{t('add')}</p>
            <Input name="name" placeholder={t('namePlaceholder')} required aria-label={t('name')} />
            <div className="flex gap-2">
              <Input name="capacity" type="number" min={1} max={100} placeholder={t('capacity')} className="w-28" />
              <Button type="submit" variant="secondary" disabled={pending} className="flex-1">{t('add')}</Button>
            </div>
          </form>
          <form className="space-y-2 rounded-sm border border-stone-200 bg-white p-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => bulkCreateTables(eventId, Number(f.get('count')), f.get('capacity') ? Number(f.get('capacity')) : undefined, t('namePlaceholder').replace(/\s*1$/, ''))); }}>
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{t('bulk')} <span className="normal-case tracking-normal text-stone-400">· {t('bulkHelp')}</span></p>
            <div className="flex gap-2">
              <Input name="count" type="number" min={1} max={60} placeholder={t('bulkCount')} required className="w-28" />
              <Input name="capacity" type="number" min={1} max={100} placeholder={t('bulkCapacity')} className="flex-1" />
            </div>
            <Button type="submit" variant="secondary" disabled={pending} className="w-full">{t('bulk')}</Button>
          </form>
        </div>
      </section>

      {/* ------------------------------------------------------- acomodar */}
      <section className="print:hidden">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">{t('assign')}</h2>
          <input className={`${inputClass} max-w-[14rem]`} placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
          {visible.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{g.display_name}</p>
                <p className="text-xs text-stone-500">{g.passes} · {g.status === 'confirmed' ? `✓ ${g.confirmed_count}` : g.status === 'declined' ? '✗' : '…'}{g.group_tag ? ` · ${g.group_tag}` : ''}</p>
              </div>
              <select className={inputClassWith('w-32 shrink-0')} value={g.table_id ?? ''} disabled={pending} onChange={(e) => run(() => assignTable(eventId, g.id, e.target.value || null))}>
                <option value="">{t('noTable')}</option>
                {tables.map((tb) => <option key={tb.table_id} value={tb.table_id}>{tb.name}</option>)}
              </select>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
