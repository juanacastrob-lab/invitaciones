'use client';

import { useState, useTransition } from 'react';
import { createEvent, updateEventBasics } from '@/actions/admin-events';
import type { ActionResult } from '@/schemas/admin';
import { Button, Field, Input, Select, Notice } from '@/components/ui';
import { TIMEZONES } from '@/lib/admin/labels';
import { EVENT_TYPES, EVENT_TYPE_LABEL, needsTwoNames, type EventType } from '@/lib/event-types';
import { TEMPLATE_IDS, TEMPLATES } from '@/templates/registry';
import { parseReminderDays } from '@/lib/reminders';

export interface EventBasicsValues {
  slug: string;
  type: EventType;
  packageCode: string;
  template: string;
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
  checkinEnabled: boolean;
  autoReminders: boolean;
  reminderDays: number[];
  saveTheDateEnabled: boolean;
}

export function EventBasicsForm({ eventId, initial, packages = [] }: { eventId?: string; initial: EventBasicsValues; packages?: { code: string; name: string; country: string }[] }) {
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
      packageCode: f.get('packageCode') || '',
      template: f.get('template') || 'aurora',
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
      checkinEnabled: f.get('checkinEnabled') === 'on',
      autoReminders: f.get('autoReminders') === 'on',
      saveTheDateEnabled: f.get('saveTheDateEnabled') === 'on',
      reminderDays: parseReminderDays(String(f.get('reminderDays') ?? '')),
    };
    start(async () => {
      setResult(eventId ? await updateEventBasics(eventId, values) : await createEvent(values));
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de evento">
          <Select value={type} onChange={(e) => setType(e.target.value as EventType)}>
            {EVENT_TYPES.map((k) => <option key={k} value={k}>{EVENT_TYPE_LABEL[k].es}</option>)}
          </Select>
        </Field>
        <Field label="Paquete" hint="Básico = solo PDF: la sección de confirmación se apaga sola.">
          <Select name="packageCode" defaultValue={initial.packageCode}>
            <option value="">Sin paquete</option>
            {packages.map((p) => <option key={`${p.code}-${p.country}`} value={p.code}>{p.name} · {p.country}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={two ? 'Nombre 1' : 'Nombre de quien celebra'}><Input name="partnerA" defaultValue={initial.partnerA} required maxLength={80} /></Field>
        <Field label={two ? 'Nombre 2' : 'Segundo nombre (opcional)'}><Input name="partnerB" defaultValue={initial.partnerB} required={two} maxLength={80} /></Field>
      </div>

      <Field label="Plantilla de diseño" hint="Mismo contenido, otro look. Se puede cambiar cuando sea; revisa la vista previa.">
        <Select name="template" defaultValue={initial.template}>
          {TEMPLATE_IDS.map((k) => <option key={k} value={k}>{TEMPLATES[k].name.es} · {TEMPLATES[k].description.es}</option>)}
        </Select>
      </Field>

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

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="saveTheDateEnabled" defaultChecked={initial.saveTheDateEnabled} /> Save the date público (funciona aunque la invitación siga en borrador)
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="checkinEnabled" defaultChecked={initial.checkinEnabled} /> Pase con QR y check-in el día del evento (extra o paquete Premium)
      </label>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="autoReminders" defaultChecked={initial.autoReminders} /> Recordatorios automáticos por correo a quien no ha confirmado
        </label>
        <Field label="Días antes de la fecha límite" hint="Separados por coma. Ej: 7,3 = un recordatorio a 7 días y otro a 3. Sin fecha límite se cuenta desde la fecha del evento. Solo a invitados con correo y con el correo configurado en Netlify.">
          <Input name="reminderDays" defaultValue={initial.reminderDays.join(',')} className="w-40" />
        </Field>
      </div>

      {result ? <Notice kind={result.ok ? 'ok' : 'error'}>{result.ok ? result.message : result.error}</Notice> : null}

      <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : eventId ? 'Guardar' : 'Crear evento'}</Button>
    </form>
  );
}
