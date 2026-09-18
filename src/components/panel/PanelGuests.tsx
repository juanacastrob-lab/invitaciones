'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { GuestRow } from '@/lib/admin/queries';
import { Badge, inputClass } from '@/components/ui';

type Filter = 'all' | 'confirmed' | 'declined' | 'pending';

/** La lista de los novios: filtrable, sin tokens ni botones de envío. */
export function PanelGuests({ guests }: { guests: GuestRow[] }) {
  const t = useTranslations('panel');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const visible = guests.filter((g) => (filter === 'all' || g.status === filter) &&
    (!q.trim() || g.display_name.toLowerCase().includes(q.trim().toLowerCase()) || (g.group_tag ?? '').toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(['all', 'confirmed', 'declined', 'pending'] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1.5 text-xs ${filter === f ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-stone-600'}`}>
            {t(`filters.${f}`)}
          </button>
        ))}
        <input className={`${inputClass} ml-auto max-w-[12rem]`} placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
        {visible.map((g) => (
          <li key={g.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{g.display_name}</p>
              <p className="text-xs text-stone-500">{g.passes} {t('passes')}{g.group_tag ? ` · ${g.group_tag}` : ''}{g.table_no ? ` · ${g.table_no}` : ''}</p>
            </div>
            <Badge tone={g.status === 'confirmed' ? 'green' : g.status === 'declined' ? 'red' : 'amber'}>
              {t(`status.${g.status}`)}{g.status === 'confirmed' ? ` · ${g.confirmed_count}` : ''}
            </Badge>
          </li>
        ))}
        {!visible.length ? <li className="p-6 text-center text-sm text-stone-500">—</li> : null}
      </ul>
    </div>
  );
}
