import type { Metadata } from 'next';
import { InvitationPage, invitationMetadata } from '../render';

type Params = Promise<{ slug: string; token: string }>;
type Search = Promise<{ lang?: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}): Promise<Metadata> {
  const { slug, token } = await params;
  const { lang } = await searchParams;
  return invitationMetadata(slug, token, lang);
}

/** Link personal: saluda por su nombre y limita el RSVP a sus pases. */
export default async function Page({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { slug, token } = await params;
  const { lang } = await searchParams;

  return <InvitationPage slug={slug} token={token} requestedLang={lang} />;
}
