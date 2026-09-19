'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { deleteAlbumPhoto } from '@/actions/album-moderation';

export function AlbumModeration({ eventId, photos: initial }: { eventId: string; photos: { id: string; url: string; uploader: string | null; created_at: string }[] }) {
  const t = useTranslations('album');
  const [photos, setPhotos] = useState(initial);
  const [pending, start] = useTransition();
  if (!photos.length) return <p className="text-sm text-stone-500">{t('empty')}</p>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {photos.map((p) => (
        <figure key={p.id} className="space-y-1">
          <img src={p.url} alt="" loading="lazy" className="aspect-square w-full rounded-sm object-cover" />
          <figcaption className="flex items-center justify-between text-[0.65rem] text-stone-500">
            <span className="truncate">{p.uploader ?? '—'}</span>
            <button type="button" disabled={pending} onClick={() => { if (window.confirm(t('deleteConfirm'))) start(async () => { const r = await deleteAlbumPhoto(eventId, p.id); if (r.ok) setPhotos((x) => x.filter((y) => y.id !== p.id)); }); }} className="text-red-700 underline">{t('delete')}</button>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
