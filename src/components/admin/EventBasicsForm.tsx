'use client';

import { useState, useTransition } from 'react';
import { createEvent, updateEventBasics } from '@/actions/admin-events';
import type { ActionResult } from '@/schemas/admin';
import { Button, Field, Input, Select, Notice } from '@/components/ui';
import { TIMEZONES } from '@/lib/admin/labels';
import { EVENT_TYPES, EVENT_TYPE_LABEL, needsTwoNames, type EventType } from '@/lib/event-types';

export interface EventBasicsValues {
  slug: string;
  type: EventType;
  partnerA: string;
  partnerB: string;
  startsAt: string;
  timezone: string;
  country: string;
  languages: string[];
  defaultLanguage: string;
  rsvpDeadline: string;
  allowPublicRsvp: boolean;
  showPrivateGifts: boolean;
}

export function EventBasicsForm({ eventId, initial }: { eventId?: string; initial: EventBasicsValues }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [type, setType] = useState<EventType>(initial.type);
  const two = needsTwoNames(type);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const languages = f.getAll('languages').map(String);
    const values = {
      slug: f.get('slug'),
      type,
      partnerA: f.get('partnerA'),
      partnerB: f.get('partnerB'),
      startsAt: f.get('startsAt'),
      timezone: f.get('timezone'),
      country: f.get('country'),
      languages,
      defaultLanguage: f.get('defaultLanguage'),
      rsvpDeadline: f.get('rsvpDeadline') || '',
      allowPublicRsvp: f.get('allowPublicRsvp') === 'on',
      showPrivateGifts: f.get('showPrivateGifts') === 'on',
    };
    start(async () => {
      setResult(eventId ? await updateEventBasics(eventId, values) : await createEvent(values));
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Tipo de evento">
        <Select value={type} onChange={(e) => setType(e.target.value as EventType)}>
          {EVENT_TYPES.map((k) => <option key={k} value={k}>{EVENT_TYPE_LABEL[k].es}</option>)}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={two ? 'Nombre 1' : 'Nombre de quien celebra'}><Input name="partnerA" defaultValue={initial.partnerA} required maxLength={80} /></Field>
        <Field label={two ? 'Nombre 2' : 'Segundo nombre (opcional)'}><Input name="partnerB" defaultValue={initial.partnerB} required={two} maxLength={80} /></Field>
      </div>

      <Field label="Slug (la parte del link)" hint="Solo minúsculas, números y guiones. Ej: ana-y-luis → holaboda.mx/i/ana-y-luis">
        <Input name="slug" defaultValue={initial.slug} required pattern="[a-z0-9-]{3,60}" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha y hora principal"><Input name="startsAt" type="datetime-local" defaultValue={initial.startsAt} required /></Field>
        <Field label="Zona horaria">
          <Select name="timezone" defaultValue={initial.timezone}>
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="País">
          <Select name="country" defaultValue={initial.country}>
            <option value="MX">México</option><option value="US">Estados Unidos</option><option value="CA">Canadá</option>
          </Select>
        </Field>
        <Field label="Idiomas">
          <div className="flex gap-4 py-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="languages" value="es" defaultChecked={initial.languages.includes('es')} /> Español</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="languages" value="en" defaultChecked={initial.languages.includes('en')} /> Inglés</label>
          </div>
        </Field>
        <Field label="Idioma principal">
          <Select name="defaultLanguage" defaultValue={initial.defaultLanguage}>
            <option value="es">Español</option><option value="en">Inglés</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Fecha límite para confirmar" hint="Vacío = sin límite">
          <Input name="rsvpDeadline" type="date" defaultValue={initial.rsvpDeadline} />
        </Field>
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input type="checkbox" name="allowPublicRsvp" defaultChecked={initial.allowPublicRsvp} /> El link general puede confirmar
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input type="checkbox" name="showPrivateGifts" defaultChecked={initial.showPrivateGifts} /> Mostrar datos bancarios (solo con link personal)
        </label>
      </div>

      {result ? <Notice kind={result.ok ? 'ok' : 'error'}>{result.ok ? result.message : result.error}</Notice> : null}

      <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : eventId ? 'Guardar' : 'Crear evento'}</Button>
    </form>
  );
}
