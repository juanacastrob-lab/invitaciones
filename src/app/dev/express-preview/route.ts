import { notFound } from 'next/navigation';
import { draftData, draftToContent } from '@/lib/drafts';
import { renderExpressPreview } from '@/lib/express-preview';

export const dynamic = 'force-dynamic';

/** La imagen de vista previa del Express con datos de mentira. No existe en producción. */
export async function GET() {
  if (process.env.NODE_ENV === 'production') notFound();
  const d = draftData.parse({ template: 'jardin', colors: { accent: '#b56b7a' }, partnerA: 'Ana Marcela', partnerB: 'Juan Antonio', headline: 'Nos casamos', date: '2027-03-13', message: 'Nos encantaría que nos acompañes.', acts: [{ kind: 'recepcion', title: 'Recepción', time: '19:00', venue: 'Hacienda', address: 'x', mapsUrl: '' }], parentsA: 'María Elena Castillo\nRoberto Basurto', parentsB: 'Guadalupe Ramírez\nAntonio Castro', photos: ['/brand/demo-portada.jpg', '/brand/hero-og.jpg'] });
  return renderExpressPreview(draftToContent(d), d, 'es');
}
