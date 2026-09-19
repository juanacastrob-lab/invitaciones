import { loadDraft } from '@/actions/draft';
import { draftToContent } from '@/lib/drafts';
import { renderExpressPreview } from '@/lib/express-preview';

export const dynamic = 'force-dynamic';

/**
 * Vista previa del Express: una imagen chica generada en el servidor. La
 * parte de arriba (diseño, fotos, nombres, fecha, padres) se ve; la
 * logística de abajo ni se dibuja: se pinta un bloque "se desbloquea al
 * pagar". Nada que recortar ni "limpiar" con IA.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const draft = await loadDraft(key);
  if (!draft) return new Response('Not found', { status: 404 });
  const res = await renderExpressPreview(draftToContent(draft.data), draft.data, draft.locale);
  res.headers.set('Cache-Control', 'private, no-store');
  return res;
}
