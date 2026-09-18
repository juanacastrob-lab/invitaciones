import type { Metadata } from 'next';
import { InvitationPage, invitationMetadata } from './render';

type Params = Promise<{ slug: string }>;
type Search = Promise<{ lang?: string; preview?: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}): Promise<Metadata> {
  const { slug } = await params;
  const { lang } = await searchParams;
  return invitationMetadata(slug, undefined, lang);
}

/** Link general: se puede ver la invitación, pero no confirmar por aquí. */
export default async function Page({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { slug } = await params;
  const { lang, preview } = await searchParams;

  return <InvitationPage slug={slug} previewKey={preview} requestedLang={lang} />;
}
