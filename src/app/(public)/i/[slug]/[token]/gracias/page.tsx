import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getInvitation, localeFor } from '@/lib/invitations';
import { pickText } from '@/schemas/event-content';
import { eventNames } from '@/lib/event-types';
import { ThankYouView } from '@/components/invitation/ThankYouView';

type Params = Promise<{ slug: string; token: string }>;
type Search = Promise<{ lang?: string }>;

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }): Promise<Metadata> {
  const { slug, token } = await params;
  const { lang } = await searchParams;
  const inv = await getInvitation(slug, token);
  if (!inv?.event.content.thankYou) return { title: 'No encontrado' };
  const locale = localeFor(inv, lang);
  const title = `${pickText(inv.event.content.thankYou.title, locale) ?? 'Gracias'} · ${eventNames(inv.event.content.couple)}`;
  return { title, openGraph: { title, type: 'website' }, robots: { index: false } };
}

/** Agradecimiento personal: solo con token válido y con texto capturado. */
export default async function Page({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug, token } = await params;
  const { lang } = await searchParams;
  const inv = await getInvitation(slug, token);
  if (!inv || !inv.token_valid || !inv.event.content.thankYou) notFound();
  return <ThankYouView invitation={inv} locale={localeFor(inv, lang)} backHref={`/i/${slug}/${token}`} />;
}
