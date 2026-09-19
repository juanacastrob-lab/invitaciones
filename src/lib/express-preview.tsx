import { ImageResponse } from 'next/og';
import { pickText, type EventContent } from '@/schemas/event-content';
import { formatDate } from '@/lib/dates';
import { resolveTemplate } from '@/templates/registry';
import { loadImage, serifFont } from '@/lib/og-card';
import type { DraftData } from '@/lib/drafts';
import type { Locale } from '@/lib/config';

const W = 520;
const H = 820;

/** La mitad de arriba de la invitación Express, como imagen. Lo de abajo va tapado. */
export async function renderExpressPreview(c: EventContent, d: DraftData, locale: Locale) {
  const th = resolveTemplate(d.template, c.colors);
  const serif = th.heading === 'serif';
  const [font, p1, p2] = await Promise.all([serifFont(), loadImage(d.photos[0] || undefined), loadImage(d.photos[1] || undefined)]);
  const text = (v: Parameters<typeof pickText>[0]) => pickText(v, locale) ?? '';
  const date = formatDate(c.startsAt, 'America/Mexico_City', locale);
  const lock = locale === 'en' ? 'Schedule, venue, dress code and gifts unlock after payment' : 'Horario, lugar, vestimenta y regalos se desbloquean al pagar';
  const bar = (w: number) => <div style={{ width: w, height: 9, borderRadius: 4, background: th.colors.line }} />;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', background: th.colors.paper, color: th.colors.ink, fontFamily: serif ? 'Cormorant' : 'sans-serif', padding: 18 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', border: `1px solid ${th.colors.line}`, borderRadius: th.radius === 'xl' ? 18 : 2, padding: 20, overflow: 'hidden' }}>
          {p1 || p2 ? (
            <div style={{ display: 'flex', gap: 8, width: '100%', height: 150 }}>
              {p1 ? <img src={p1} alt="" style={{ flex: 1, height: 150, objectFit: 'cover', borderRadius: th.radius === 'xl' ? 12 : 2 }} /> : null}
              {p2 ? <img src={p2} alt="" style={{ flex: 1, height: 150, objectFit: 'cover', borderRadius: th.radius === 'xl' ? 12 : 2 }} /> : null}
            </div>
          ) : null}
          <div style={{ marginTop: 18, fontSize: 11, letterSpacing: 4, color: th.colors.muted, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>{text(c.cover?.headline)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 8, fontSize: 40, lineHeight: 1.05, textAlign: 'center' }}>
            <span>{c.couple.partnerA}</span>
            {c.couple.partnerB ? <span style={{ color: th.colors.accent, fontSize: 28 }}>&amp;</span> : null}
            {c.couple.partnerB ? <span>{c.couple.partnerB}</span> : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <div style={{ width: 32, height: 1, background: th.colors.line }} />
            <div style={{ fontSize: 11, letterSpacing: 3, color: th.colors.muted, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>{date}</div>
            <div style={{ width: 32, height: 1, background: th.colors.line }} />
          </div>
          {text(c.cover?.tagline) ? <div style={{ marginTop: 10, fontSize: 17, color: th.colors.muted, textAlign: 'center' }}>{text(c.cover?.tagline)}</div> : null}
          {c.parents ? (
            <div style={{ display: 'flex', gap: 24, marginTop: 16, width: '100%', justifyContent: 'center' }}>
              {c.parents.groups.map((g, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ fontSize: 9, letterSpacing: 3, color: th.colors.accent, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>{text(g.title)}</div>
                  {g.names.map((n) => <div key={n} style={{ fontSize: 16, marginTop: 3 }}>{n}</div>)}
                </div>
              ))}
            </div>
          ) : null}

          {/* Lo de abajo: solo barras de relleno y el candado. Nunca el texto real. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto', width: '100%', paddingTop: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'flex-start' }}>{bar(90)}{bar(260)}{bar(200)}{bar(150)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'flex-start' }}>{bar(110)}{bar(240)}{bar(180)}</div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>{bar(80)}{bar(140)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>{bar(80)}{bar(160)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{bar(90)}{bar(240)}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6, padding: '12px 14px', borderRadius: 999, background: th.colors.accentSoft, color: th.colors.ink, fontSize: 12, fontFamily: 'sans-serif', textAlign: 'center' }}>
              🔒 {lock}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts: [{ name: 'Cormorant', data: font, style: 'normal', weight: 500 }] },
  );
}
