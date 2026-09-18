import { notFound } from 'next/navigation';
import { demoEventContent } from '@/demo/demo-event';
import { renderInvitationCard, OG_SIZE } from '@/lib/og-card';

export const alt = 'Vista previa de la tarjeta';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const dynamic = 'force-dynamic';

/** Para revisar la tarjeta sin base de datos. No existe en producción. */
export default async function Image() {
  if (process.env.NODE_ENV === 'production') notFound();
  return renderInvitationCard(demoEventContent, 'America/Mexico_City', 'es');
}
