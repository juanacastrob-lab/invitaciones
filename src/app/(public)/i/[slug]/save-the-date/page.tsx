import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getSaveTheDate } from '@/lib/invitations';
import { resolveLocale } from '@/lib/locale';
import { pickText } from '@/schemas/event-content';
import { eventNames } from '@/lib/event-types';
import { formatDateShort } from '@/lib/dates';
import { getSiteUrl } from '@/lib/env';
import { SaveTheDateView } from '@/components/invitation/SaveTheDateView';

type Params = Promise<{ slug: string }>;
type Search = Promise<{ lang?: string }>;

async function origin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  return host ? `${h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')}://${host}` : getSiteUrl();
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }): Promise<Metadata> {
  const { slug } = await params;
  const { lang } = await searchParams;
  const data = await getSaveTheDate(slug);
  if (!data) return { title: 'No encontrado' };
  const locale = resolveLocale({ languages: data.languages, defaultLanguage: data.default_language, requested: lang });
  const title = `Save the date · ${eventNames(data.couple)} · ${formatDateShort(data.startsAt, data.timezone, locale)}`;
  const description = pickText(data.note ?? undefined, locale) ?? pickText(data.og?.description ?? undefined, locale) ?? '';
  const site = await origin();
  return {
    title, description,
    openGraph: { title, description, type: 'website', ...(site ? { url: `${site}/i/${slug}/save-the-date` } : {}) },
    twitter: { card: 'summary_large_image', title, description },
    ...(site ? { metadataBase: new URL(site) } : {}),
  };
}

/** Save the date público. Vive aunque la invitación siga en borrador. */
export default async function Page({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const data = await getSaveTheDate(slug);
  if (!data) notFound();
  const locale = resolveLocale({ languages: data.languages, defaultLanguage: data.default_language, requested: lang });
  return <SaveTheDateView data={data} locale={locale} path={`/i/${slug}/save-the-date`} />;
}
