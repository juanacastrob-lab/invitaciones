'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createUploadUrl } from '@/actions/media';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { MEDIA_BUCKET, extFromMime } from '@/lib/media';
import { resizeImage } from '@/lib/editor/resize';
import { Button, inputClass } from '@/components/ui';

/**
 * Una foto: se sube desde el celular (reducida en el navegador, directo a
 * Storage) o se pega un link. `kind` og = JPEG, porque el generador de la
 * tarjeta de WhatsApp no lee WebP.
 */
export function PhotoField({ label, value, onChange, eventId, kind = 'photo', hint }: { label: string; value: string; onChange: (url: string) => void; eventId: string; kind?: 'photo' | 'og'; hint?: string }) {
  const t = useTranslations('editor');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const { blob, mime } = await resizeImage(file, { maxSide: kind === 'og' ? 1200 : 1600, format: kind === 'og' ? 'jpeg' : 'webp' });
      const ext = extFromMime(mime);
      if (!ext) throw new Error(t('uploadError'));
      const r = await createUploadUrl(eventId, ext);
      if (!r.ok || !r.data) throw new Error(r.ok ? t('uploadError') : r.error);
      const { error: upErr } = await supabaseBrowser().storage.from(MEDIA_BUCKET).uploadToSignedUrl(r.data.path, r.data.token, blob, { contentType: mime, upsert: false });
      if (upErr) throw new Error(upErr.message);
      onChange(r.data.publicUrl);
    } catch (e) {
      setError((e as Error).message || t('uploadError'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{label}</span>
      <div className="flex items-start gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-20 w-20 shrink-0 rounded-sm border border-stone-200 object-cover" />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-sm border border-dashed border-stone-300 text-[0.6rem] uppercase tracking-widest text-stone-400">{t('noPhoto')}</div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>{busy ? t('uploading') : value ? t('replace') : t('upload')}</Button>
            <Button type="button" variant="ghost" onClick={() => setLinkMode((v) => !v)}>{t('pasteLink')}</Button>
            {value ? <Button type="button" variant="ghost" onClick={() => onChange('')}>{t('removePhoto')}</Button> : null}
          </div>
          {linkMode ? <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder="https://…" /> : null}
          {error ? <p className="text-xs text-red-700">{error}</p> : null}
          {hint && !error ? <p className="text-xs text-stone-400">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}
