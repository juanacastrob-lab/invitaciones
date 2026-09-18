import { notFound } from 'next/navigation';
import { demoEventContent } from '@/demo/demo-event';
import { SaveTheDateView } from '@/components/invitation/SaveTheDateView';

export const dynamic = 'force-dynamic';

/** Save the date del demo, para revisar el diseño. No existe en producción. */
export default async function DevSaveTheDate({ searchParams }: { searchParams: Promise<{ lang?: string; template?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { lang, template } = await searchParams;
  const c = demoEventContent;
  return (
    <SaveTheDateView
      locale={lang === 'en' ? 'en' : 'es'}
      path="/dev/save-the-date"
      data={{ slug: 'juan-y-ana', type: 'boda', template: template ?? 'aurora', languages: ['es', 'en'], default_language: 'es', timezone: 'America/Mexico_City',
        couple: c.couple, startsAt: c.startsAt, cover: c.cover, og: c.og, venue: c.itinerary?.acts[0]?.venue.name,
        note: { es: 'Aparta el 13 de marzo: nos casamos en Tepoztlán y queremos que estés.', en: 'Save March 13: we are getting married in Tepoztlán and we want you there.' } }}
    />
  );
}
