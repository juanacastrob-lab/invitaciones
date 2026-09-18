import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { EventContent } from '@/schemas/event-content';
import { pickText } from '@/schemas/event-content';
import { formatDateShort } from '@/lib/dates';
import { APP_NAME, type Locale } from '@/lib/config';
import { resolveTemplate } from '@/templates/registry';

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * La tarjeta que sale al pegar el link en WhatsApp, iMessage o Facebook.
 *
 * Nombres, fecha y lugar sobre la foto de portada. Se cachea: se genera una
 * vez por evento, no por invitado ni por visita.
 */

let fontCache: ArrayBuffer | null = null;
async function serifFont(): Promise<ArrayBuffer> {
  if (!fontCache) {
    const buf = await readFile(join(process.cwd(), 'src/assets/fonts/CormorantGaramond-Medium.ttf'));
    fontCache = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }
  return fontCache;
}

/** Fotos del propio sitio se leen del disco; las de Storage se bajan. */
async function loadImage(url: string | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    if (url.startsWith('/')) {
      const buf = await readFile(join(process.cwd(), 'public', url));
      const mime = url.endsWith('.png') ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${buf.toString('base64')}`;
    }
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return null;
    const mime = res.headers.get('content-type') ?? 'image/jpeg';
    return `data:${mime};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
  } catch (e) {
    console.warn('[og] no se pudo cargar la foto:', (e as Error).message);
    return null;
  }
}

export async function renderInvitationCard(content: EventContent, timezone: string, locale: Locale, template?: string | null) {
  const [font, photo] = await Promise.all([serifFont(), loadImage(content.og?.image)]);
  const th = resolveTemplate(template).colors;
  const date = formatDateShort(content.startsAt, timezone, locale);
  const place = content.itinerary?.acts[0]?.venue.name ?? pickText(content.cover?.tagline, locale) ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: th.paper,
          fontFamily: 'Cormorant',
          color: th.ink,
        }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" width={480} height={630} style={{ objectFit: 'cover', width: 480, height: 630 }} />
        ) : (
          <div style={{ width: 480, height: 630, display: 'flex', background: 'linear-gradient(160deg, #e8e0d5, #faf8f5)' }} />
        )}

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '48px 56px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 22, letterSpacing: 8, color: th.muted, textTransform: 'uppercase' }}>
            {pickText(content.cover?.headline, locale) ?? ''}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 28, fontSize: 84, lineHeight: 1.05 }}>
            <span>{content.couple.partnerA}</span>
            {content.couple.partnerB ? <span style={{ color: th.accent, fontSize: 56, margin: '4px 0' }}>&amp;</span> : null}
            {content.couple.partnerB ? <span>{content.couple.partnerB}</span> : null}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 34 }}>
            <div style={{ width: 48, height: 1, background: th.line }} />
            <div style={{ fontSize: 24, letterSpacing: 4, color: th.muted, textTransform: 'uppercase' }}>{date}</div>
            <div style={{ width: 48, height: 1, background: th.line }} />
          </div>

          {place ? <div style={{ marginTop: 14, fontSize: 26, color: th.muted }}>{place}</div> : null}

          <div style={{ position: 'absolute', bottom: 28, right: 40, fontSize: 18, letterSpacing: 4, color: '#c9c2b8', textTransform: 'uppercase' }}>
            {APP_NAME}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [{ name: 'Cormorant', data: font, style: 'normal', weight: 500 }],
    },
  );
}
