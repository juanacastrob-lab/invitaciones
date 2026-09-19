'use client';

import { useState, useTransition } from 'react';
import { setEventStatus, updateEventContent, duplicateEvent, deleteEvent } from '@/actions/admin-events';
import type { ActionResult } from '@/schemas/admin';
import { Button, Input, Notice, Textarea } from '@/components/ui';
import { NEXT_STATUS, STATUS_LABEL, type EventStatus } from '@/lib/admin/labels';

export function StatusButtons({ eventId, status }: { eventId: string; status: EventStatus }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {NEXT_STATUS[status].map((next) => (
          <Button key={next} variant={next === 'publicado' ? 'primary' : 'secondary'} disabled={pending}
            onClick={() => start(async () => setResult(await setEventStatus(eventId, next)))}>
            → {STATUS_LABEL[next]}
          </Button>
        ))}
      </div>
      {result ? <Notice kind={result.ok ? 'ok' : 'error'}>{result.ok ? result.message : result.error}</Notice> : null}
    </div>
  );
}

export function JsonEditor({ eventId, json }: { eventId: string; json: string }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState(json);
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="space-y-3">
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} spellCheck={false} className="min-h-[28rem] font-mono text-xs" />
      {result ? <Notice kind={result.ok ? 'ok' : 'error'}>{result.ok ? result.message : result.error}</Notice> : null}
      <div className="flex gap-2">
        <Button disabled={pending} onClick={() => start(async () => setResult(await updateEventContent(eventId, value)))}>
          {pending ? 'Guardando…' : 'Guardar contenido'}
        </Button>
        <Button variant="ghost" type="button" onClick={() => { try { setValue(JSON.stringify(JSON.parse(value), null, 2)); } catch { setResult({ ok: false, error: 'El JSON no es válido.' }); } }}>
          Ordenar JSON
        </Button>
      </div>
    </div>
  );
}

export function DuplicateForm({ eventId, suggested }: { eventId: string; suggested: string }) {
  const [pending, start] = useTransition();
  const [slug, setSlug] = useState(suggested);
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug-nuevo" />
        <Button variant="secondary" disabled={pending} onClick={() => start(async () => setResult(await duplicateEvent(eventId, slug)))}>Duplicar</Button>
      </div>
      {result && !result.ok ? <Notice kind="error">{result.error}</Notice> : null}
    </div>
  );
}

export function DeleteButton({ eventId, slug }: { eventId: string; slug: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="space-y-2">
      <Button variant="danger" disabled={pending}
        onClick={() => { if (window.prompt(`Escribe "${slug}" para borrar el evento y TODOS sus invitados.`) === slug) start(async () => setResult(await deleteEvent(eventId))); }}>
        Borrar evento
      </Button>
      {result && !result.ok ? <Notice kind="error">{result.error}</Notice> : null}
    </div>
  );
}

export function CopyButton({ value, label = 'Copiar' }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button variant="ghost" type="button" onClick={async () => { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}>
      {done ? 'Copiado' : label}
    </Button>
  );
}
