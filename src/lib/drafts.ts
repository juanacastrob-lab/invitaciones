import { z } from 'zod';
import type { EventContent } from '@/schemas/event-content';
import { templateContent } from '@/lib/admin/template';
import { EVENT_TYPES, type EventType } from '@/lib/event-types';
import { TEMPLATE_IDS } from '@/templates/registry';

/**
 * El borrador del wizard de la tienda: lo que el cliente llena antes de pagar.
 * Es más simple que EventContent (un idioma, campos planos) y aquí se convierte.
 */

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const short = (n: number) => z.string().trim().max(n).default('');
const url = z.string().trim().max(500).default('');

export const draftAct = z.object({
  kind: z.enum(['civil', 'religiosa', 'recepcion', 'otro']).default('recepcion'),
  title: short(60),
  time: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal('')).default(''),
  venue: short(100),
  address: short(200),
  mapsUrl: url,
});

export const draftData = z.object({
  template: z.enum(TEMPLATE_IDS).default('aurora'),
  colors: z.object({ paper: hex.optional(), ink: hex.optional(), accent: hex.optional() }).default({}),
  eventType: z.enum(EVENT_TYPES).default('boda'),
  partnerA: short(80),
  partnerB: short(80),
  headline: short(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).default(''),
  acts: z.array(draftAct).max(4).default([]),
  parentsA: short(200),   // "Padres de la novia" (nombres, uno por línea)
  parentsB: short(200),
  photos: z.array(url).max(2).default([]),
  dressCode: short(60),
  message: short(400),
  giftsNote: short(400),
  email: z.string().trim().toLowerCase().email().max(200).or(z.literal('')).default(''),
  phone: short(30),
});
export type DraftData = z.infer<typeof draftData>;

export const EMPTY_DRAFT: DraftData = draftData.parse({});

/** Fecha y hora "2027-03-13T17:00" a partir de la fecha y la hora del primer acto. */
export function draftStartsAt(d: DraftData): string {
  const date = d.date || new Date(Date.now() + 180 * 86_400_000).toISOString().slice(0, 10);
  const time = d.acts.find((a) => a.time)?.time || '17:00';
  return `${date}T${time}`;
}

const PARENT_TITLES: Record<string, { a: { es: string; en: string }; b: { es: string; en: string } }> = {
  boda: { a: { es: 'Padres de la novia', en: 'Parents of the bride' }, b: { es: 'Padres del novio', en: 'Parents of the groom' } },
  default: { a: { es: 'Sus padres', en: 'Parents' }, b: { es: 'Sus padrinos', en: 'Godparents' } },
};

/**
 * Convierte el borrador en el contenido real de la invitación, partiendo de
 * la plantilla del tipo de evento. Lo que el cliente no llenó, no aparece.
 */
export function draftToContent(d: DraftData): EventContent {
  const startsAt = draftStartsAt(d);
  const c = templateContent({ partnerA: d.partnerA || 'Nombre', partnerB: d.partnerB || undefined, startsAt, type: d.eventType });
  const lt = (v: string) => ({ es: v, en: v });

  if (Object.values(d.colors).some(Boolean)) c.colors = d.colors;
  if (d.headline) c.cover = { ...c.cover, headline: lt(d.headline), envelope: false, monogram: false };
  if (d.message) c.cover = { ...(c.cover ?? { envelope: false, monogram: false }), tagline: lt(d.message) };
  if (d.photos[0]) {
    c.cover = { ...(c.cover ?? { envelope: false, monogram: false }), photo: { url: d.photos[0] } };
    c.og = { ...c.og, image: d.photos[0] };
  }
  if (d.photos[1]) c.gallery = { photos: [{ url: d.photos[0] }, { url: d.photos[1] }] };

  // Los actos salen aunque falte el lugar ("Por confirmar"): así la vista previa ya se ve completa.
  const acts = d.acts.filter((a) => a.venue || a.title);
  const itineraryTitle = c.itinerary?.title;
  c.itinerary = undefined;
  if (acts.length) {
    c.itinerary = {
      title: itineraryTitle,
      acts: acts.map((a, i) => ({
        id: `act-${i + 1}`,
        kind: a.kind,
        title: lt(a.title || { civil: 'Ceremonia civil', religiosa: 'Ceremonia religiosa', recepcion: 'Recepción', otro: 'Evento' }[a.kind]),
        startsAt: `${startsAt.slice(0, 10)}T${a.time || startsAt.slice(11)}`,
        venue: { name: a.venue || 'Por confirmar', address: a.address || a.venue || 'Por confirmar', mapsUrl: a.mapsUrl || undefined },
      })),
    };
  }

  const names = (v: string) => v.split(/\n|,/).map((x) => x.trim()).filter(Boolean);
  const titles = PARENT_TITLES[d.eventType] ?? PARENT_TITLES.default;
  const groups = [names(d.parentsA).length ? { title: titles.a, names: names(d.parentsA) } : null, names(d.parentsB).length ? { title: titles.b, names: names(d.parentsB) } : null].filter(Boolean) as { title: { es: string; en: string }; names: string[] }[];
  c.parents = groups.length ? { groups } : undefined;

  if (d.dressCode) c.dressCode = { ...c.dressCode, code: lt(d.dressCode), notes: undefined };
  else c.dressCode = undefined;
  if (d.giftsNote) c.gifts = { ...(c.gifts ?? { links: [], envelopes: false }), note: lt(d.giftsNote), links: [], bank: undefined, cash: undefined, envelopes: false };
  else c.gifts = undefined;
  c.noKids = undefined;
  c.faq = undefined;

  const order: EventContent['sectionOrder'] = ['cover', 'countdown'];
  if (c.parents) order.push('parents');
  if (c.itinerary) order.push('itinerary');
  if (c.dressCode) order.push('dressCode');
  if (c.gifts) order.push('gifts');
  if (c.gallery) order.push('gallery');
  order.push('rsvp');
  c.sectionOrder = order;
  return c;
}

/** Cuánto del borrador está listo, para la barra de "te falta" del wizard. */
export function draftMissing(d: DraftData): ('names' | 'date' | 'venue')[] {
  const m: ('names' | 'date' | 'venue')[] = [];
  if (!d.partnerA) m.push('names');
  if (!d.date) m.push('date');
  if (!d.acts.some((a) => a.venue)) m.push('venue');
  return m;
}

/** Diseño con el que arranca cada tipo de evento; el cliente lo puede cambiar. */
export function templateForType(type: EventType): (typeof TEMPLATE_IDS)[number] {
  switch (type) {
    case 'xv': case 'sweet_sixteen': case 'cumpleanos': return 'fiesta';
    case 'bautizo': case 'baby_shower': case 'primera_comunion': case 'confirmacion': return 'jardin';
    case 'graduacion': return 'minimal';
    default: return 'aurora';
  }
}

export function isExpress(packageCode: string): boolean {
  return packageCode === 'express' || packageCode === 'basico';
}

export function isEventTypeValue(v: unknown): v is EventType {
  return typeof v === 'string' && (EVENT_TYPES as readonly string[]).includes(v);
}
