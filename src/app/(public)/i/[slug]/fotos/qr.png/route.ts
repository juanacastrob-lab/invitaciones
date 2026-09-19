import QRCode from 'qrcode';
import { getAlbum } from '@/lib/invitations';
import { getSiteUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** QR al álbum, para imprimir y poner en las mesas. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const album = await getAlbum(slug);
  if (!album) return new Response('Not found', { status: 404 });
  const url = `${getSiteUrl() ?? ''}/i/${slug}/fotos`;
  const png = await QRCode.toBuffer(url, { margin: 2, width: 900, errorCorrectionLevel: 'M' });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600', 'Content-Disposition': `inline; filename="qr-fotos-${slug}.png"` } });
}
