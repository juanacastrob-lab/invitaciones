import { EVENT_TYPE_LABEL, type EventType } from '@/lib/event-types';
import type { PublicReview } from '@/lib/reviews';
import type { Locale } from '@/lib/config';

/** Reseñas aprobadas en la portada. Sin reseñas, la sección no existe. */
export function Reviews({ reviews, locale, title, subtitle }: { reviews: PublicReview[]; locale: Locale; title: string; subtitle: string }) {
  if (!reviews.length) return null;
  return (
    <section className="px-5 py-14">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-[0.7rem] uppercase tracking-[0.3em] text-stone-400">{title}</h2>
        <p className="mt-2 text-center text-xs text-stone-500">{subtitle}</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <li key={r.id} className="flex flex-col rounded-sm border border-stone-200 bg-white p-5">
              <p className="text-sm tracking-[0.2em] text-stone-900" aria-label={`${r.rating}/5`}>{'★'.repeat(r.rating)}<span className="text-stone-300">{'★'.repeat(5 - r.rating)}</span></p>
              <p className="mt-3 flex-1 font-serif text-lg leading-snug text-stone-800">“{r.body}”</p>
              <p className="mt-4 text-xs text-stone-500">{r.author_name}{r.city ? ` · ${r.city}` : ''} · {EVENT_TYPE_LABEL[r.event_type as EventType]?.[locale] ?? r.event_type}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
