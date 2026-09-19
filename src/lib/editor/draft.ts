import {
  SECTION_IDS,
  cover as coverSchema,
  quote as quoteSchema,
  parents as parentsSchema,
  countdown as countdownSchema,
  story as storySchema,
  itinerary as itinerarySchema,
  dressCode as dressCodeSchema,
  noKids as noKidsSchema,
  gifts as giftsSchema,
  lodging as lodgingSchema,
  gallery as gallerySchema,
  music as musicSchema,
  faq as faqSchema,
  rsvp as rsvpSchema,
  type EventContent,
  type SectionId,
} from '@/schemas/event-content';

/**
 * El "borrador" es el contenido del evento tal como lo maneja el formulario:
 * todo presente, sin `undefined`, y con textos vacíos donde no hay nada.
 * Así los inputs siempre tienen un valor y el cliente no se pelea con
 * opcionales. Al guardar, `fromDraft` limpia lo vacío y arma el contenido
 * real, que se valida con el mismo Zod que usa la invitación.
 */

export type LT = { es: string; en: string };
export type ActKind = 'civil' | 'religiosa' | 'recepcion' | 'otro';

export interface Draft {
  couple: { partnerA: string; partnerB: string };
  startsAt: string;
  og: { title: LT; description: LT; image: string };
  saveTheDate: { note: LT };
  thankYou: { title: LT; body: LT; photoUrl: string; photoAlt: LT };
  /** Secciones visibles, en orden. Las demás se guardan si están completas. */
  sectionOrder: SectionId[];
  cover: { headline: LT; tagline: LT; photoUrl: string; photoAlt: LT; video: string; envelope: boolean; monogram: boolean };
  quote: { text: LT; author: string };
  parents: { title: LT; groups: { title: LT; names: string }[] };
  countdown: { label: LT };
  story: { title: LT; body: LT; photoUrl: string; photoAlt: LT };
  itinerary: {
    title: LT;
    acts: { id: string; kind: ActKind; title: LT; startsAt: string; venueName: string; address: string; lat: string; lng: string; note: LT }[];
  };
  dressCode: { title: LT; code: LT; notes: LT; palette: string[] };
  noKids: { note: LT };
  gifts: {
    title: LT;
    note: LT;
    links: { label: LT; url: string }[];
    bank: { bank: string; holder: string; clabe: string; account: string; note: LT };
    envelopes: boolean;
  };
  lodging: { title: LT; options: { name: string; note: LT; url: string; phone: string }[] };
  gallery: { title: LT; photos: { url: string; alt: LT }[] };
  music: { url: string; title: string; artist: string };
  faq: { title: LT; items: { q: LT; a: LT }[] };
  rsvp: {
    title: LT;
    note: LT;
    askMenu: boolean;
    menuOptions: { id: string; label: LT }[];
    askDietary: boolean;
    askSong: boolean;
    askMessage: boolean;
  };
}

type MaybeLT = { es?: string; en?: string } | undefined;

const lt = (v: MaybeLT): LT => ({ es: v?.es ?? '', en: v?.en ?? '' });
const emptyLT = (): LT => ({ es: '', en: '' });

export function newId(prefix = 'x'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function toDraft(c: EventContent): Draft {
  return {
    couple: { partnerA: c.couple.partnerA, partnerB: c.couple.partnerB ?? '' },
    startsAt: c.startsAt,
    og: { title: lt(c.og?.title), description: lt(c.og?.description), image: c.og?.image ?? '' },
    saveTheDate: { note: lt(c.saveTheDate?.note) },
    thankYou: { title: lt(c.thankYou?.title), body: lt(c.thankYou?.body), photoUrl: c.thankYou?.photo?.url ?? '', photoAlt: lt(c.thankYou?.photo?.alt) },
    sectionOrder: [...c.sectionOrder],
    cover: { headline: lt(c.cover?.headline), tagline: lt(c.cover?.tagline), photoUrl: c.cover?.photo?.url ?? '', photoAlt: lt(c.cover?.photo?.alt), video: c.cover?.video ?? '', envelope: c.cover?.envelope ?? false, monogram: c.cover?.monogram ?? false },
    quote: { text: lt(c.quote?.text), author: c.quote?.author ?? '' },
    parents: { title: lt(c.parents?.title), groups: (c.parents?.groups ?? []).map((g) => ({ title: lt(g.title), names: g.names.join('\n') })) },
    countdown: { label: lt(c.countdown?.label) },
    story: { title: lt(c.story?.title), body: lt(c.story?.body), photoUrl: c.story?.photo?.url ?? '', photoAlt: lt(c.story?.photo?.alt) },
    itinerary: {
      title: lt(c.itinerary?.title),
      acts: (c.itinerary?.acts ?? []).map((a) => ({
        id: a.id,
        kind: a.kind,
        title: lt(a.title),
        startsAt: a.startsAt,
        venueName: a.venue.name,
        address: a.venue.address,
        lat: a.venue.lat === undefined ? '' : String(a.venue.lat),
        lng: a.venue.lng === undefined ? '' : String(a.venue.lng),
        note: lt(a.note),
      })),
    },
    dressCode: { title: lt(c.dressCode?.title), code: lt(c.dressCode?.code), notes: lt(c.dressCode?.notes), palette: [...(c.dressCode?.palette ?? [])] },
    noKids: { note: lt(c.noKids?.note) },
    gifts: {
      title: lt(c.gifts?.title),
      note: lt(c.gifts?.note),
      links: (c.gifts?.links ?? []).map((l) => ({ label: lt(l.label), url: l.url })),
      bank: {
        bank: c.gifts?.bank?.bank ?? '',
        holder: c.gifts?.bank?.holder ?? '',
        clabe: c.gifts?.bank?.clabe ?? '',
        account: c.gifts?.bank?.account ?? '',
        note: lt(c.gifts?.bank?.note),
      },
      envelopes: c.gifts?.envelopes ?? false,
    },
    lodging: { title: lt(c.lodging?.title), options: (c.lodging?.options ?? []).map((o) => ({ name: o.name, note: lt(o.note), url: o.url ?? '', phone: o.phone ?? '' })) },
    gallery: { title: lt(c.gallery?.title), photos: (c.gallery?.photos ?? []).map((p) => ({ url: p.url, alt: lt(p.alt) })) },
    music: { url: c.music?.url ?? '', title: c.music?.title ?? '', artist: c.music?.artist ?? '' },
    faq: { title: lt(c.faq?.title), items: (c.faq?.items ?? []).map((i) => ({ q: lt(i.q), a: lt(i.a) })) },
    rsvp: {
      title: lt(c.rsvp?.title),
      note: lt(c.rsvp?.note),
      askMenu: c.rsvp?.askMenu ?? false,
      menuOptions: (c.rsvp?.menuOptions ?? []).map((m) => ({ id: m.id, label: lt(m.label) })),
      askDietary: c.rsvp?.askDietary ?? false,
      askSong: c.rsvp?.askSong ?? false,
      askMessage: c.rsvp?.askMessage ?? true,
    },
  };
}

// -----------------------------------------------------------------------------
// Draft → contenido
// -----------------------------------------------------------------------------

const s = (v: string): string | undefined => {
  const t = v.trim();
  return t ? t : undefined;
};

/** Texto localizado sin idiomas vacíos; `undefined` si no hay nada. */
function outLT(v: LT): { es?: string; en?: string } | undefined {
  const out: { es?: string; en?: string } = {};
  if (s(v.es)) out.es = v.es.trim();
  if (s(v.en)) out.en = v.en.trim();
  return out.es || out.en ? out : undefined;
}

const num = (v: string): number | undefined => {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

function photo(url: string, alt: LT) {
  return s(url) ? { url: url.trim(), alt: outLT(alt) } : undefined;
}

/** Cada sección como la espera el esquema, sin validar todavía. */
function sectionValue(d: Draft, id: SectionId): unknown {
  switch (id) {
    case 'cover':
      return { headline: outLT(d.cover.headline), tagline: outLT(d.cover.tagline), photo: photo(d.cover.photoUrl, d.cover.photoAlt), video: s(d.cover.video), envelope: d.cover.envelope, monogram: d.cover.monogram };
    case 'quote':
      return { text: outLT(d.quote.text), author: s(d.quote.author) };
    case 'parents':
      return {
        title: outLT(d.parents.title),
        groups: d.parents.groups.map((g) => ({ title: outLT(g.title), names: g.names.split(/\n+/).map((n) => n.trim()).filter(Boolean) })),
      };
    case 'countdown':
      return { label: outLT(d.countdown.label) };
    case 'story':
      return { title: outLT(d.story.title), body: outLT(d.story.body), photo: photo(d.story.photoUrl, d.story.photoAlt) };
    case 'itinerary':
      return {
        title: outLT(d.itinerary.title),
        acts: d.itinerary.acts.map((a) => ({
          id: a.id,
          kind: a.kind,
          title: outLT(a.title),
          startsAt: a.startsAt,
          venue: { name: a.venueName.trim(), address: a.address.trim(), lat: num(a.lat), lng: num(a.lng) },
          note: outLT(a.note),
        })),
      };
    case 'dressCode':
      return { title: outLT(d.dressCode.title), code: outLT(d.dressCode.code), notes: outLT(d.dressCode.notes), palette: d.dressCode.palette.filter((c) => c.trim()) };
    case 'noKids':
      return { note: outLT(d.noKids.note) };
    case 'gifts': {
      const b = d.gifts.bank;
      const bank = s(b.bank) || s(b.holder) || s(b.clabe) || s(b.account)
        ? { bank: b.bank.trim(), holder: b.holder.trim(), clabe: s(b.clabe), account: s(b.account), note: outLT(b.note) }
        : undefined;
      return {
        title: outLT(d.gifts.title),
        note: outLT(d.gifts.note),
        links: d.gifts.links.filter((l) => s(l.url) || outLT(l.label)).map((l) => ({ label: outLT(l.label), url: l.url.trim() })),
        bank,
        envelopes: d.gifts.envelopes,
      };
    }
    case 'lodging':
      return {
        title: outLT(d.lodging.title),
        options: d.lodging.options.map((o) => ({ name: o.name.trim(), note: outLT(o.note), url: s(o.url), phone: s(o.phone) })),
      };
    case 'gallery':
      return { title: outLT(d.gallery.title), photos: d.gallery.photos.filter((p) => s(p.url)).map((p) => ({ url: p.url.trim(), alt: outLT(p.alt) })) };
    case 'music':
      return { url: d.music.url.trim(), title: s(d.music.title), artist: s(d.music.artist) };
    case 'faq':
      return { title: outLT(d.faq.title), items: d.faq.items.map((i) => ({ q: outLT(i.q), a: outLT(i.a) })) };
    case 'rsvp':
      return {
        title: outLT(d.rsvp.title),
        note: outLT(d.rsvp.note),
        askMenu: d.rsvp.askMenu,
        menuOptions: d.rsvp.menuOptions.map((m) => ({ id: m.id, label: outLT(m.label) })),
        askDietary: d.rsvp.askDietary,
        askSong: d.rsvp.askSong,
        askMessage: d.rsvp.askMessage,
      };
  }
}

const SECTION_SCHEMA = {
  cover: coverSchema,
  quote: quoteSchema,
  parents: parentsSchema,
  countdown: countdownSchema,
  story: storySchema,
  itinerary: itinerarySchema,
  dressCode: dressCodeSchema,
  noKids: noKidsSchema,
  gifts: giftsSchema,
  lodging: lodgingSchema,
  gallery: gallerySchema,
  music: musicSchema,
  faq: faqSchema,
  rsvp: rsvpSchema,
} as const;

/**
 * Arma el contenido a guardar. Las secciones visibles van tal cual (si les
 * falta algo, la validación lo dice). Las ocultas se conservan solo si están
 * completas, para no perder lo capturado al apagar una sección un rato.
 */
export function fromDraft(d: Draft): unknown {
  const out: Record<string, unknown> = {
    version: 1,
    couple: { partnerA: d.couple.partnerA.trim(), partnerB: s(d.couple.partnerB) },
    startsAt: d.startsAt,
    og: { title: outLT(d.og.title), description: outLT(d.og.description), image: s(d.og.image) },
    sectionOrder: d.sectionOrder,
    saveTheDate: outLT(d.saveTheDate.note) ? { note: outLT(d.saveTheDate.note) } : undefined,
    thankYou: outLT(d.thankYou.body) ? { title: outLT(d.thankYou.title), body: outLT(d.thankYou.body), photo: photo(d.thankYou.photoUrl, d.thankYou.photoAlt) } : undefined,
  };
  for (const id of SECTION_IDS) {
    const value = sectionValue(d, id);
    if (d.sectionOrder.includes(id)) {
      out[id] = value;
    } else if (SECTION_SCHEMA[id].safeParse(value).success) {
      out[id] = value;
    }
  }
  return out;
}

/** Mueve una sección un lugar arriba o abajo dentro del orden. */
export function moveSection(order: SectionId[], id: SectionId, dir: -1 | 1): SectionId[] {
  const i = order.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return order;
  const next = [...order];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Enciende o apaga una sección; al encender, la pone antes del RSVP (o al final). */
export function toggleSection(order: SectionId[], id: SectionId, on: boolean): SectionId[] {
  if (!on) return order.filter((x) => x !== id);
  if (order.includes(id)) return order;
  const next = [...order];
  const rsvpAt = next.indexOf('rsvp');
  if (id === 'rsvp' || rsvpAt < 0) next.push(id);
  else next.splice(rsvpAt, 0, id);
  return next;
}
