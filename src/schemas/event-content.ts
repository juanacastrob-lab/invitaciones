import { z } from 'zod';
import { LOCALES, type Locale } from '@/lib/config';

/**
 * Contenido de un evento (columna `events.content`, JSONB).
 *
 * Toda la data del evento vive aquí, no en el código de la plantilla. Así la
 * misma información sirve para cualquier plantilla, presente o futura, y
 * cambiar de diseño no obliga a recapturar nada.
 */

// -----------------------------------------------------------------------------
// Piezas base
// -----------------------------------------------------------------------------

/** Un texto en los idiomas que tenga el evento. Al menos uno. */
export const localizedText = z
  .object({
    es: z.string().trim().min(1).optional(),
    en: z.string().trim().min(1).optional(),
  })
  .refine((v) => Boolean(v.es || v.en), {
    message: 'El texto necesita al menos un idioma.',
  });

export type LocalizedText = z.infer<typeof localizedText>;

/**
 * Devuelve el texto en el idioma pedido, y si no existe, en el otro que haya.
 * Una invitación a medio traducir se ve incompleta, pero nunca vacía.
 */
export function pickText(
  text: LocalizedText | undefined,
  locale: Locale,
): string | undefined {
  if (!text) return undefined;
  if (text[locale]) return text[locale];
  for (const l of LOCALES) {
    if (text[l]) return text[l];
  }
  return undefined;
}

export const image = z.object({
  url: z.string().min(1),
  alt: localizedText.optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

/** Fecha y hora sin zona: la zona es del evento (`events.timezone`). */
export const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Usa el formato 2027-03-13T17:00');

export const venue = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  /** Coordenadas para los botones de mapas. Sin ellas se usa la dirección. */
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

// -----------------------------------------------------------------------------
// Secciones
// -----------------------------------------------------------------------------

export const SECTION_IDS = [
  'cover',
  'quote',
  'countdown',
  'parents',
  'story',
  'itinerary',
  'dressCode',
  'noKids',
  'gifts',
  'lodging',
  'transport',
  'gallery',
  'music',
  'faq',
  'rsvp',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const cover = z.object({
  headline: localizedText.optional(),
  tagline: localizedText.optional(),
  photo: image.optional(),
  /** Video de fondo (mp4, corto, sin audio). La foto queda de poster. */
  video: z.string().min(1).optional(),
  /** Sobre que se abre al tocar, antes de ver la invitación. */
  envelope: z.boolean().default(false),
  /** Monograma con las iniciales arriba de los nombres. */
  monogram: z.boolean().default(false),
});

/** Una frase, versículo o dedicatoria, con autor opcional. */
export const quote = z.object({
  text: localizedText,
  author: z.string().optional(),
});

/** Padres y padrinos: grupos con título y nombres ("Padres de la novia", "Padrinos de velación"...). */
export const parents = z.object({
  title: localizedText.optional(),
  groups: z.array(z.object({ title: localizedText, names: z.array(z.string().min(1)).min(1) })).min(1),
});

export const countdown = z.object({
  label: localizedText.optional(),
});

export const story = z.object({
  title: localizedText.optional(),
  body: localizedText,
  photo: image.optional(),
});

/** Cada acto de la boda: civil, religiosa, recepción... */
export const itineraryAct = z.object({
  id: z.string().min(1),
  kind: z.enum(['civil', 'religiosa', 'recepcion', 'otro']),
  title: localizedText,
  startsAt: localDateTime,
  venue,
  note: localizedText.optional(),
});

export const itinerary = z.object({
  title: localizedText.optional(),
  acts: z.array(itineraryAct).min(1),
});

export const dressCode = z.object({
  title: localizedText.optional(),
  code: localizedText,
  notes: localizedText.optional(),
  /** Colores sugeridos, en hex, para pintar la paleta. */
  palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(6).optional(),
});

export const noKids = z.object({
  note: localizedText,
});

export const giftLink = z.object({
  label: localizedText,
  url: z.string().min(1),
});

/**
 * Datos bancarios: solo se muestran en el link personal cuando el evento
 * tiene `show_private_gifts`. No van en el link general, que se reenvía.
 */
export const bankDetails = z.object({
  bank: z.string().min(1),
  holder: z.string().min(1),
  clabe: z.string().optional(),
  account: z.string().optional(),
  note: localizedText.optional(),
});

/** Lluvia de sobres digital: nota y, si hay, un link de pago (Mercado Pago, PayPal, Stripe). */
export const cashGift = z.object({
  note: localizedText.optional(),
  paymentUrl: z.string().min(1).optional(),
});

export const gifts = z.object({
  title: localizedText.optional(),
  note: localizedText.optional(),
  links: z.array(giftLink).default([]),
  bank: bankDetails.optional(),
  cash: cashGift.optional(),
  envelopes: z.boolean().default(false),
});

export const lodgingOption = z.object({
  name: z.string().min(1),
  note: localizedText.optional(),
  url: z.string().optional(),
  phone: z.string().optional(),
});

export const lodging = z.object({
  title: localizedText.optional(),
  options: z.array(lodgingOption).min(1),
});

/** Transporte y traslados: camiones, horarios, estacionamiento. */
export const transport = z.object({
  title: localizedText.optional(),
  note: localizedText.optional(),
  options: z.array(z.object({ name: z.string().min(1), note: localizedText.optional(), time: z.string().optional(), url: z.string().optional() })).min(1),
});

export const gallery = z.object({
  title: localizedText.optional(),
  photos: z.array(image).min(1),
});

/** Nunca se precarga: solo se baja cuando el invitado toca play. */
export const music = z.object({
  url: z.string().min(1),
  title: z.string().optional(),
  artist: z.string().optional(),
});

export const faq = z.object({
  title: localizedText.optional(),
  items: z
    .array(z.object({ q: localizedText, a: localizedText }))
    .min(1),
});

export const menuOption = z.object({
  id: z.string().min(1),
  label: localizedText,
});

/** Pregunta libre del evento: texto, sí/no o elegir una opción. */
export const rsvpQuestion = z.object({
  id: z.string().min(1),
  label: localizedText,
  type: z.enum(['text', 'yesno', 'choice']),
  options: z.array(localizedText).default([]),
});

export const rsvp = z.object({
  title: localizedText.optional(),
  note: localizedText.optional(),
  askChildren: z.boolean().default(false),
  questions: z.array(rsvpQuestion).max(6).default([]),
  askMenu: z.boolean().default(false),
  menuOptions: z.array(menuOption).default([]),
  askDietary: z.boolean().default(false),
  askSong: z.boolean().default(false),
  askMessage: z.boolean().default(true),
});

/** Save the date: la fecha y una nota; sale meses antes de la invitación. */
export const saveTheDate = z.object({
  note: localizedText.optional(),
});

/** Álbum de fotos de los invitados (/i/slug/fotos). Se enciende desde el editor. */
export const album = z.object({
  enabled: z.boolean().default(false),
  title: localizedText.optional(),
  note: localizedText.optional(),
});

/** Agradecimiento después del evento, en el link personal. */
export const thankYou = z.object({
  title: localizedText.optional(),
  body: localizedText,
  photo: image.optional(),
});

// -----------------------------------------------------------------------------
// Contenido completo
// -----------------------------------------------------------------------------

export const eventContent = z
  .object({
    version: z.literal(1),

    /** Los nombres. En boda son dos; en XV, bautizo, graduación... suele ser uno. */
    couple: z.object({
      partnerA: z.string().min(1),
      partnerB: z.string().min(1).optional(),
    }),

    /** El momento principal: el que manda en la cuenta regresiva y el .ics. */
    startsAt: localDateTime,

    /** Para el preview de WhatsApp e iMessage. */
    og: z
      .object({
        title: localizedText.optional(),
        description: localizedText.optional(),
        /** Foto para la tarjeta de WhatsApp. JPEG o PNG: el generador no lee WebP. */
        image: z.string().min(1).optional(),
      })
      .optional(),

    /** Qué secciones se muestran y en qué orden. */
    sectionOrder: z.array(z.enum(SECTION_IDS)).min(1),

    cover: cover.optional(),
    quote: quote.optional(),
    parents: parents.optional(),
    countdown: countdown.optional(),
    story: story.optional(),
    itinerary: itinerary.optional(),
    dressCode: dressCode.optional(),
    noKids: noKids.optional(),
    gifts: gifts.optional(),
    lodging: lodging.optional(),
    transport: transport.optional(),
    gallery: gallery.optional(),
    music: music.optional(),
    faq: faq.optional(),
    rsvp: rsvp.optional(),

    saveTheDate: saveTheDate.optional(),
    thankYou: thankYou.optional(),
    album: album.optional(),
  })
  .superRefine((value, ctx) => {
    // Una sección listada pero sin datos deja un hueco en la invitación.
    // Vale más que falle aquí que que el cliente lo vea publicado.
    for (const id of value.sectionOrder) {
      if (id === 'cover' || id === 'countdown' || id === 'rsvp') continue;
      if (value[id] === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['sectionOrder'],
          message: `La sección "${id}" está en el orden pero no tiene contenido.`,
        });
      }
    }

    if (value.rsvp?.askMenu && (value.rsvp.menuOptions?.length ?? 0) === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['rsvp', 'menuOptions'],
        message: 'Si se pregunta el menú, tiene que haber opciones.',
      });
    }
  });

export type EventContent = z.infer<typeof eventContent>;

/** Valida el JSONB que viene de la base. Nunca confiar en que ya está bien. */
export function parseEventContent(value: unknown) {
  return eventContent.safeParse(value);
}
