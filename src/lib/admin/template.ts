import { demoEventContent } from '@/demo/demo-event';
import type { EventContent } from '@/schemas/event-content';
import { eventNames, type EventType } from '@/lib/event-types';

/** Textos iniciales por tipo de evento. Después se ajustan en el editor. */
const PRESETS: Record<EventType, {
  headline: { es: string; en: string };
  description: { es: string; en: string };
  acts: { kind: 'civil' | 'religiosa' | 'recepcion' | 'otro'; title: { es: string; en: string }; hours: number }[];
  story: boolean;
  noKids: boolean;
}> = {
  boda: {
    headline: { es: 'Nos casamos', en: 'We are getting married' },
    description: { es: 'Nos casamos y queremos que estés ahí. Confirma tu asistencia.', en: 'We are getting married and we want you there. Please RSVP.' },
    acts: [{ kind: 'civil', title: { es: 'Ceremonia civil', en: 'Civil ceremony' }, hours: 0 }, { kind: 'religiosa', title: { es: 'Ceremonia religiosa', en: 'Religious ceremony' }, hours: 1.5 }, { kind: 'recepcion', title: { es: 'Recepción', en: 'Reception' }, hours: 3 }],
    story: true, noKids: true,
  },
  xv: {
    headline: { es: 'Mis XV años', en: 'My quinceañera' },
    description: { es: 'Celebro mis XV años y quiero que me acompañes. Confirma tu asistencia.', en: 'I am celebrating my quinceañera and I want you there. Please RSVP.' },
    acts: [{ kind: 'religiosa', title: { es: 'Misa', en: 'Mass' }, hours: 0 }, { kind: 'recepcion', title: { es: 'Fiesta', en: 'Party' }, hours: 2 }],
    story: false, noKids: false,
  },
  bautizo: {
    headline: { es: 'Mi bautizo', en: 'My baptism' },
    description: { es: 'Celebramos el bautizo y queremos que estés ahí. Confirma tu asistencia.', en: 'We are celebrating the baptism and we want you there. Please RSVP.' },
    acts: [{ kind: 'religiosa', title: { es: 'Ceremonia', en: 'Ceremony' }, hours: 0 }, { kind: 'recepcion', title: { es: 'Comida', en: 'Lunch' }, hours: 1.5 }],
    story: false, noKids: false,
  },
  baby_shower: {
    headline: { es: 'Baby shower', en: 'Baby shower' },
    description: { es: 'Esperamos a nuestro bebé y queremos celebrar contigo. Confirma tu asistencia.', en: 'We are expecting and we want to celebrate with you. Please RSVP.' },
    acts: [{ kind: 'recepcion', title: { es: 'Baby shower', en: 'Baby shower' }, hours: 0 }],
    story: false, noKids: false,
  },
  graduacion: {
    headline: { es: 'Mi graduación', en: 'My graduation' },
    description: { es: 'Me gradúo y quiero celebrarlo contigo. Confirma tu asistencia.', en: 'I am graduating and I want to celebrate with you. Please RSVP.' },
    acts: [{ kind: 'otro', title: { es: 'Ceremonia', en: 'Ceremony' }, hours: 0 }, { kind: 'recepcion', title: { es: 'Fiesta', en: 'Party' }, hours: 3 }],
    story: false, noKids: false,
  },
  cumpleanos: {
    headline: { es: 'Mi cumpleaños', en: 'My birthday' },
    description: { es: 'Celebro mi cumpleaños y quiero que vengas. Confirma tu asistencia.', en: 'I am celebrating my birthday and I want you there. Please RSVP.' },
    acts: [{ kind: 'recepcion', title: { es: 'Fiesta', en: 'Party' }, hours: 0 }],
    story: false, noKids: false,
  },
  primera_comunion: {
    headline: { es: 'Mi primera comunión', en: 'My first communion' },
    description: { es: 'Celebro mi primera comunión y quiero que me acompañes. Confirma tu asistencia.', en: 'I am celebrating my first communion and I want you there. Please RSVP.' },
    acts: [{ kind: 'religiosa', title: { es: 'Misa', en: 'Mass' }, hours: 0 }, { kind: 'recepcion', title: { es: 'Comida', en: 'Lunch' }, hours: 1.5 }],
    story: false, noKids: false,
  },
  confirmacion: {
    headline: { es: 'Mi confirmación', en: 'My confirmation' },
    description: { es: 'Celebro mi confirmación y quiero que me acompañes. Confirma tu asistencia.', en: 'I am celebrating my confirmation and I want you there. Please RSVP.' },
    acts: [{ kind: 'religiosa', title: { es: 'Misa', en: 'Mass' }, hours: 0 }, { kind: 'recepcion', title: { es: 'Comida', en: 'Lunch' }, hours: 1.5 }],
    story: false, noKids: false,
  },
  otro: {
    headline: { es: 'Te invitamos', en: 'You are invited' },
    description: { es: 'Queremos que nos acompañes. Confirma tu asistencia.', en: 'We want you there. Please RSVP.' },
    acts: [{ kind: 'otro', title: { es: 'Evento', en: 'Event' }, hours: 0 }],
    story: false, noKids: false,
  },
};

/** Suma horas a un "2027-03-13T17:00" sin zona horaria. */
function addHours(local: string, hours: number): string {
  if (!hours) return local;
  const d = new Date(`${local}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + Math.round(hours * 60));
  return d.toISOString().slice(0, 16);
}

/** El contenido con el que arranca un evento nuevo, según su tipo. */
export function templateContent(b: { partnerA: string; partnerB?: string; startsAt: string; type?: EventType }): EventContent {
  const type = b.type ?? 'boda';
  const p = PRESETS[type];
  const base = structuredClone(demoEventContent);
  const names = eventNames({ partnerA: b.partnerA, partnerB: b.partnerB });

  base.couple = b.partnerB ? { partnerA: b.partnerA, partnerB: b.partnerB } : { partnerA: b.partnerA };
  base.startsAt = b.startsAt;
  base.og = { title: { es: names, en: names }, description: { ...p.description } };
  base.cover = { headline: { ...p.headline }, tagline: undefined, photo: undefined };
  base.story = undefined;
  base.gallery = undefined;
  base.lodging = undefined;
  base.gifts = base.gifts ? { ...base.gifts, links: [], bank: undefined, envelopes: false } : undefined;
  if (!p.noKids) base.noKids = undefined;
  base.itinerary = {
    title: base.itinerary?.title,
    acts: p.acts.map((a, i) => ({
      id: `act-${i + 1}`,
      kind: a.kind,
      title: { ...a.title },
      startsAt: addHours(b.startsAt, a.hours),
      venue: { name: 'Por definir', address: 'Por definir' },
    })),
  };
  base.sectionOrder = ['cover', 'countdown', 'itinerary', 'dressCode', 'gifts', 'faq', 'rsvp'];
  return base;
}

/** Un slug único a partir de los nombres: "ana-y-luis-k3f2". */
export function slugFromNames(a: string, b: string | undefined, suffix: string): string {
  const clean = (v: string) => v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
  const base = [clean(a), b ? clean(b) : ''].filter(Boolean).join('-y-');
  return `${base || 'evento'}-${suffix}`.slice(0, 60);
}
