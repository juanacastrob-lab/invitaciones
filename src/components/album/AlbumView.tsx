'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createAlbumUploadUrl, registerAlbumPhoto } from '@/actions/album';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { MEDIA_BUCKET, extFromMime } from '@/lib/media';
import { resizeImage } from '@/lib/editor/resize';

export interface AlbumPhoto { id: string; url: string; uploader: string | null; caption: string | null }

/**
 * El álbum del evento: cuadrícula, botón de subir (varias a la vez, reducidas
 * en el celular) y modo presentación para la pantalla del salón.
 */
export function AlbumView({ slug, initial, slideshow, mediaBase }: { slug: string; initial: AlbumPhoto[]; slideshow: boolean; mediaBase: string }) {
  const t = useTranslations('album');
  const [photos, setPhotos] = useState<AlbumPhoto[]>(initial);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { try { setName(localStorage.getItem('hb-album-name') ?? ''); } catch { /* nada */ } }, []);

  // Presentación: avanza sola y recarga la lista cada 20 s.
  useEffect(() => {
    if (!slideshow) return;
    const a = setInterval(() => setIdx((i) => (photos.length ? (i + 1) % photos.length : 0)), 6000);
    const b = setInterval(() => window.location.reload(), 120000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [slideshow, photos.length]);

  async function upload(files: FileList) {
    setError(null);
    const list = Array.from(files).slice(0, 10);
    setBusy({ done: 0, total: list.length });
    try { localStorage.setItem('hb-album-name', name); } catch { /* nada */ }
    for (const [i, file] of list.entries()) {
      try {
        const { blob, mime } = await resizeImage(file, { maxSide: 1600, format: 'webp' });
        const ext = extFromMime(mime);
        if (!ext) throw new Error(t('error'));
        const r = await createAlbumUploadUrl(slug, ext);
        if (!r.ok) throw new Error(r.error === 'too_many_attempts' ? t('tooMany') : t('error'));
        const { error: upErr } = await supabaseBrowser().storage.from(MEDIA_BUCKET).uploadToSignedUrl(r.path, r.token, blob, { contentType: mime });
        if (upErr) throw new Error(upErr.message);
        const reg = await registerAlbumPhoto(slug, r.path, name, '');
        if (!reg.ok) throw new Error(t('error'));
        setPhotos((p) => [{ id: r.path, url: r.publicUrl, uploader: name || null, caption: null }, ...p]);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy({ done: i + 1, total: list.length });
      }
    }
    setTimeout(() => setBusy(null), 1500);
    if (input.current) input.current.value = '';
  }

  if (slideshow) {
    const p = photos[idx];
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        {p ? <img key={p.id} src={p.url} alt="" className="max-h-full max-w-full object-contain transition-opacity duration-1000" /> : <p className="text-white/70">{t('empty')}</p>}
        {p?.uploader ? <p className="absolute bottom-6 left-0 right-0 text-center text-sm text-white/80">{p.uploader}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-[var(--line)] bg-[var(--accent-soft)] p-4 text-center">
        <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) void upload(e.target.files); }} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('yourName')} maxLength={60} className="mb-3 w-full rounded-sm border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-center text-sm text-[var(--ink)]" />
        <button type="button" disabled={Boolean(busy)} onClick={() => input.current?.click()} className="w-full rounded-full bg-[var(--ink)] px-6 py-3 text-xs uppercase tracking-[0.25em] text-[var(--paper)] disabled:opacity-60">
          {busy ? t('uploading', { done: busy.done, total: busy.total }) : t('upload')}
        </button>
        {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
        <p className="mt-2 text-[0.65rem] text-[var(--muted)]">{t('hint')}</p>
      </div>
      {!photos.length ? <p className="text-center text-sm text-[var(--muted)]">{t('empty')}</p> : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((p) => (
            <figure key={p.id} className="relative">
              <img src={p.url.startsWith('http') || p.url.startsWith('/') ? p.url : `${mediaBase}/${p.url}`} alt={p.caption ?? ''} loading="lazy" className="aspect-square w-full rounded-sm object-cover" />
              {p.uploader ? <figcaption className="absolute bottom-1 left-1 rounded-full bg-black/50 px-2 py-0.5 text-[0.6rem] text-white">{p.uploader}</figcaption> : null}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
