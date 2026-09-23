'use client';

import { useState, useTransition } from 'react';
import { deleteReview, setReviewApproved } from '@/actions/reviews';
import { Badge, Button, Notice } from '@/components/ui';
import type { ActionResult } from '@/schemas/admin';
import { EVENT_TYPE_LABEL, type EventType } from '@/lib/event-types';

export interface ReviewRow { id: string; author_name: string; rating: number; body: string; event_type: string; city: string | null; approved_at: string | null; featured: boolean; created_at: string; event_name?: string | null }

export function ReviewsManager({ reviews, isAdmin }: { reviews: ReviewRow[]; isAdmin: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = (fn: () => Promise<ActionResult>) => start(async () => setResult(await fn()));
  return (
    <div className="space-y-3">
      {result && !result.ok ? <Notice kind="error">{result.error}</Notice> : null}
      {!reviews.length ? <p className="rounded-sm border border-stone-200 bg-white p-4 text-sm text-stone-500">Todavía no hay reseñas. Los novios las dejan desde su panel cuando su invitación ya está publicada o entregada.</p> : null}
      {reviews.map((r) => (
        <div key={r.id} className={`rounded-sm border bg-white p-4 ${r.approved_at ? 'border-stone-200' : 'border-amber-300'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">{'★'.repeat(r.rating)}<span className="text-stone-300">{'★'.repeat(5 - r.rating)}</span> <strong className="ml-2">{r.author_name}</strong>{r.city ? ` · ${r.city}` : ''} <span className="text-stone-500">· {EVENT_TYPE_LABEL[r.event_type as EventType]?.es ?? r.event_type}{r.event_name ? ` · ${r.event_name}` : ''}</span></p>
            <div className="flex items-center gap-2">
              <Badge tone={r.approved_at ? 'green' : 'amber'}>{r.approved_at ? 'Publicada' : 'Pendiente'}</Badge>
              {r.featured ? <Badge tone="blue">Destacada</Badge> : null}
            </div>
          </div>
          <p className="mt-2 text-sm italic text-stone-700">“{r.body}”</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {r.approved_at
              ? <Button variant="secondary" disabled={pending} onClick={() => run(() => setReviewApproved(r.id, false))}>Ocultar</Button>
              : <Button disabled={pending} onClick={() => run(() => setReviewApproved(r.id, true))}>Publicar en la portada</Button>}
            <Button variant="ghost" disabled={pending} onClick={() => run(() => setReviewApproved(r.id, Boolean(r.approved_at), !r.featured))}>{r.featured ? 'Quitar destacada' : 'Destacar'}</Button>
            {isAdmin ? <Button variant="danger" disabled={pending} onClick={() => { if (confirm('¿Borrar esta reseña?')) run(() => deleteReview(r.id)); }}>Borrar</Button> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
