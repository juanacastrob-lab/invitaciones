import { getInvitation, localeFor } from '@/lib/invitations';
import { renderInvitationCard, OG_SIZE } from '@/lib/og-card';

export const alt = 'Invitación';
export const size = OG_SIZE;
export const contentType = 'image/png';

/** Se regenera a lo mucho una vez al día por evento; no por visita. */
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const invitation = await getInvitation(slug);
  if (!invitation) return new Response('Not found', { status: 404 });

  return renderInvitationCard(invitation.event.content, invitation.event.timezone, localeFor(invitation), invitation.event.template);
}
