import { join } from 'node:path';
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { pickText, type EventContent } from '@/schemas/event-content';
import { formatDate, formatTime } from '@/lib/dates';
import { eventNames } from '@/lib/event-types';
import { APP_NAME, type Locale } from '@/lib/config';

/**
 * La invitación en PDF (paquete Básico, y descarga para cualquier evento).
 * Una hoja A4 con lo esencial: nombres, fecha, actos, vestimenta, regalos y
 * cómo confirmar. Si el evento está publicado lleva QR al link general.
 *
 * react-pdf no lee WebP: solo entran fotos JPG o PNG (la de la tarjeta de
 * WhatsApp siempre lo es).
 */

const L = {
  es: { itinerary: 'Itinerario', dressCode: 'Código de vestimenta', gifts: 'Mesa de regalos', envelopes: 'También habrá sobres el día del evento', rsvp: 'Confirma tu asistencia', deadline: 'Antes del', scan: 'Escanea o abre el link', noKids: 'Evento solo para adultos', madeWith: 'Invitación hecha con' },
  en: { itinerary: 'Schedule', dressCode: 'Dress code', gifts: 'Gift registry', envelopes: 'Envelopes are welcome on the day', rsvp: 'RSVP', deadline: 'Before', scan: 'Scan or open the link', noKids: 'Adults only', madeWith: 'Invitation made with' },
} as const;

const SERIF = 'Cormorant';
let fontRegistered = false;
function registerFonts() {
  if (fontRegistered) return;
  Font.register({ family: SERIF, src: join(process.cwd(), 'src/assets/fonts/CormorantGaramond-Medium.ttf') });
  // Sin separar palabras con guiones: los nombres se ven mejor enteros.
  Font.registerHyphenationCallback((w) => [w]);
  fontRegistered = true;
}

const INK = '#2b2723';
const MUTED = '#8a837a';
const ACCENT = '#7d8471';
const LINE = '#e2dcd3';

const s = StyleSheet.create({
  page: { backgroundColor: '#faf8f5', padding: 24, fontFamily: 'Helvetica', color: INK, fontSize: 10.5, lineHeight: 1.45 },
  frame: { flex: 1, borderWidth: 0.75, borderColor: LINE, padding: 20 },
  photo: { width: '100%', height: 100, objectFit: 'cover', marginBottom: 10 },
  photos: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  photoHalf: { flex: 1, height: 110, objectFit: 'cover' },
  parents: { flexDirection: 'row', gap: 16, marginTop: 4, marginBottom: 4, justifyContent: 'center' },
  parentsCol: { flex: 1, alignItems: 'center' },
  parentName: { fontFamily: SERIF, fontSize: 12.5, textAlign: 'center' },
  headline: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: MUTED, textAlign: 'center' },
  names: { fontFamily: SERIF, fontSize: 28, textAlign: 'center', marginTop: 3, lineHeight: 1.05 },
  amp: { fontFamily: SERIF, fontSize: 22, color: ACCENT, textAlign: 'center', lineHeight: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 8 },
  rule: { width: 28, height: 0.75, backgroundColor: LINE, marginHorizontal: 10 },
  date: { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: MUTED },
  tagline: { fontFamily: SERIF, fontSize: 13, textAlign: 'center', color: MUTED, marginBottom: 10 },
  section: { marginTop: 7 },
  row: { flexDirection: 'row', gap: 16, marginTop: 7 },
  col: { flex: 1 },
  title: { fontSize: 7.5, letterSpacing: 2.5, textTransform: 'uppercase', color: ACCENT, marginBottom: 4 },
  act: { marginBottom: 3 },
  actTitle: { fontFamily: SERIF, fontSize: 14 },
  small: { fontSize: 9, color: MUTED },
  body: { fontSize: 10.5 },
  rsvpBox: { marginTop: 10, paddingTop: 8, borderTopWidth: 0.75, borderTopColor: LINE, flexDirection: 'row', alignItems: 'center', gap: 12 },
  qr: { width: 64, height: 64 },
  footer: { marginTop: 'auto', paddingTop: 10, fontSize: 7, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED, textAlign: 'center' },
});

export interface PdfInput {
  content: EventContent;
  timezone: string;
  locale: Locale;
  /** Link general si el evento está publicado; con él se pinta el QR. */
  url?: string;
  rsvpDeadline?: string | null;
}

function pdfImage(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (!/\.(jpe?g|png)(\?.*)?$/i.test(url)) return undefined;
  return url.startsWith('/') ? join(process.cwd(), 'public', url) : url;
}

function InvitationDoc({ content: c, timezone, locale, url, qr, rsvpDeadline }: PdfInput & { qr?: string }) {
  const t = L[locale];
  const text = (v: Parameters<typeof pickText>[0]) => pickText(v, locale);
  const on = (id: EventContent['sectionOrder'][number]) => c.sectionOrder.includes(id);
  const gallery = (c.gallery?.photos ?? []).map((p) => pdfImage(p.url)).filter((u): u is string => Boolean(u)).slice(0, 2);
  const photo = gallery.length ? null : (pdfImage(c.og?.image) ?? pdfImage(c.cover?.photo?.url));
  const deadline = rsvpDeadline ? formatDate(rsvpDeadline.slice(0, 16), timezone, locale) : null;

  return (
    <Document title={eventNames(c.couple)} author={APP_NAME} language={locale}>
      <Page size="A4" style={s.page}>
        <View style={s.frame}>
          {gallery.length ? <View style={s.photos}>{gallery.map((u, i) => <Image key={i} src={u} style={s.photoHalf} />)}</View> : null}
          {photo ? <Image src={photo} style={s.photo} /> : null}
          {text(c.cover?.headline) ? <Text style={s.headline}>{text(c.cover?.headline)}</Text> : null}
          <Text style={s.names}>{c.couple.partnerA}</Text>
          {c.couple.partnerB ? (
            <>
              <Text style={s.amp}>&</Text>
              <Text style={s.names}>{c.couple.partnerB}</Text>
            </>
          ) : null}
          <View style={s.dateRow}>
            <View style={s.rule} />
            <Text style={s.date}>{formatDate(c.startsAt, timezone, locale)}</Text>
            <View style={s.rule} />
          </View>
          {text(c.cover?.tagline) ? <Text style={s.tagline}>{text(c.cover?.tagline)}</Text> : null}

          {on('parents') && c.parents ? (
            <View style={s.parents}>
              {c.parents.groups.map((g, i) => (
                <View key={i} style={s.parentsCol}>
                  <Text style={s.title}>{text(g.title)}</Text>
                  {g.names.map((n) => <Text key={n} style={s.parentName}>{n}</Text>)}
                </View>
              ))}
            </View>
          ) : null}

          {on('itinerary') && c.itinerary ? (
            <View style={s.section}>
              <Text style={s.title}>{text(c.itinerary.title) ?? t.itinerary}</Text>
              {c.itinerary.acts.map((a) => (
                <View key={a.id} style={s.act}>
                  <Text style={s.actTitle}>{text(a.title)} · {formatTime(a.startsAt, timezone, locale)}</Text>
                  <Text style={s.body}>{a.venue.name}</Text>
                  <Text style={s.small}>{a.venue.address}</Text>
                  {a.venue.mapsUrl ? <Text style={s.small}>{a.venue.mapsUrl}</Text> : null}
                  {text(a.note) ? <Text style={s.small}>{text(a.note)}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}

          {/* Vestimenta y "solo adultos" van lado a lado: caben en una hoja. */}
          {(on('dressCode') && c.dressCode) || (on('noKids') && c.noKids) ? (
            <View style={s.row}>
              {on('dressCode') && c.dressCode ? (
                <View style={s.col}>
                  <Text style={s.title}>{text(c.dressCode.title) ?? t.dressCode}</Text>
                  <Text style={s.body}>{text(c.dressCode.code)}</Text>
                  {text(c.dressCode.notes) ? <Text style={s.small}>{text(c.dressCode.notes)}</Text> : null}
                </View>
              ) : null}
              {on('noKids') && c.noKids ? (
                <View style={s.col}>
                  <Text style={s.title}>{t.noKids}</Text>
                  <Text style={s.small}>{text(c.noKids.note)}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {on('gifts') && c.gifts && (text(c.gifts.note) || c.gifts.links.length || c.gifts.envelopes) ? (
            <View style={s.section}>
              <Text style={s.title}>{text(c.gifts.title) ?? t.gifts}</Text>
              {text(c.gifts.note) ? <Text style={s.body}>{text(c.gifts.note)}</Text> : null}
              {c.gifts.links.map((l, i) => (
                <Text key={i} style={s.small}>{text(l.label)}: {l.url}</Text>
              ))}
              {c.gifts.envelopes ? <Text style={s.small}>{t.envelopes}</Text> : null}
            </View>
          ) : null}

          {/* Sin sección RSVP (paquete Básico) no se pide confirmar ni hay QR. */}
          {on('rsvp') ? (
            <View style={s.rsvpBox}>
              {qr ? <Image src={qr} style={s.qr} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{text(c.rsvp?.title) ?? t.rsvp}</Text>
                {text(c.rsvp?.note) ? <Text style={s.body}>{text(c.rsvp?.note)}</Text> : null}
                {deadline ? <Text style={s.small}>{t.deadline} {deadline}</Text> : null}
                {url ? <Text style={s.small}>{t.scan}: {url}</Text> : null}
              </View>
            </View>
          ) : null}

          <Text style={s.footer}>{t.madeWith} {APP_NAME}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvitationPdf(input: PdfInput): Promise<Buffer> {
  registerFonts();
  const qr = input.url ? await QRCode.toDataURL(input.url, { margin: 0, width: 256, color: { dark: INK, light: '#faf8f5' } }) : undefined;
  return renderToBuffer(<InvitationDoc {...input} qr={qr} />);
}
