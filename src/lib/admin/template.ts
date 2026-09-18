import { demoEventContent } from '@/demo/demo-event';
import type { EventContent } from '@/schemas/event-content';

/** El contenido que se copia al crear un evento nuevo desde la plantilla. */
export function templateContent(b: { partnerA: string; partnerB: string; startsAt: string }): EventContent {
  const base = structuredClone(demoEventContent);
  base.couple = { partnerA: b.partnerA, partnerB: b.partnerB };
  base.startsAt = b.startsAt;
  base.og = {
    title: { es: `${b.partnerA} & ${b.partnerB}`, en: `${b.partnerA} & ${b.partnerB}` },
    description: base.og?.description,
  };
  base.cover = { headline: base.cover?.headline, tagline: undefined, photo: undefined };
  base.story = undefined;
  base.gallery = undefined;
  base.gifts = base.gifts ? { ...base.gifts, links: [], bank: undefined, envelopes: false } : undefined;
  base.lodging = undefined;
  base.sectionOrder = ['cover', 'countdown', 'itinerary', 'dressCode', 'gifts', 'faq', 'rsvp'];
  for (const act of base.itinerary?.acts ?? []) act.startsAt = b.startsAt;
  return base;
}


/** Un slug único a partir de los nombres: "ana-y-luis-k3f2". */
export function slugFromNames(a: string, b: string | undefined, suffix: string): string {
  const clean = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
  const base = [clean(a), b ? clean(b) : ''].filter(Boolean).join('-y-');
  return `${base || 'evento'}-${suffix}`.slice(0, 60);
}
