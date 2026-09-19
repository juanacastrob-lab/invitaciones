'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { approveEvent } from '@/actions/panel';
import { Button, LinkButton, Notice } from '@/components/ui';

export function ApproveBox({ eventId, previewHref, editHref }: { eventId: string; previewHref: string; editHref: string }) {
  const t = useTranslations('panel');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="rounded-sm border border-amber-200 bg-amber-50 p-5">
      <h2 className="font-serif text-2xl">{t('approve.title')}</h2>
      <p className="mt-2 text-sm text-stone-700">{t('approve.body')}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <LinkButton href={previewHref} target="_blank">{t('openInvitation')}</LinkButton>
        <LinkButton href={editHref}>{t('editContent')}</LinkButton>
        <Button disabled={pending} onClick={() => { if (window.confirm(t('approve.confirm'))) start(async () => { const r = await approveEvent(eventId); if (!r.ok) setError(r.error); }); }}>
          {pending ? '…' : t('approve.button')}
        </Button>
      </div>
      {error ? <div className="mt-3"><Notice kind="error">{error}</Notice></div> : null}
    </section>
  );
}
