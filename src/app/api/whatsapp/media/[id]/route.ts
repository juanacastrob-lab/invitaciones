import { getSessionProfile } from '@/lib/auth';
import { fetchWhatsappMedia } from '@/lib/whatsapp/cloud';

export const dynamic = 'force-dynamic';

/** Foto/audio/documento que mandó un cliente por WhatsApp. Solo el equipo; el token nunca sale al navegador. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionProfile();
  if (!me || (me.role !== 'admin' && me.role !== 'staff')) return new Response('forbidden', { status: 403 });
  const { id } = await params;
  const r = await fetchWhatsappMedia(id);
  if (!r.ok) return new Response(r.error, { status: 502 });
  return new Response(r.bytes, { headers: { 'Content-Type': r.mime, 'Cache-Control': 'private, max-age=3600' } });
}
