'use client';

import { useRef, useState } from 'react';
import { createDraftUploadUrl } from '@/actions/draft';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { MEDIA_BUCKET } from '@/lib/media';
import { resizeImage } from '@/lib/editor/resize';

/** Una foto del wizard: se reduce en el navegador y sube directo a Storage (JPEG, para el PDF). */
export function DraftPhotoField({ draftKey, value, onChange, label, hint, removeLabel }: { draftKey: string; value: string; onChange: (url: string) => void; label: string; hint: string; removeLabel: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setBusy(true); setError(null);
    try {
      const { blob, mime } = await resizeImage(file, { maxSide: 1400, format: 'jpeg', quality: 0.86 });
      const r = await createDraftUploadUrl(draftKey);
      if (!r.ok || !r.data) throw new Error(r.ok ? 'upload' : r.error);
      const { error: upErr } = await supabaseBrowser().storage.from(MEDIA_BUCKET).uploadToSignedUrl(r.data.path, r.data.token, blob, { contentType: mime, upsert: false });
      if (upErr) throw new Error(upErr.message);
      onChange(r.data.publicUrl);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="rounded-sm border border-dashed border-stone-300 bg-white p-3">
      <p className="mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{label}</p>
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt="" className="h-20 w-20 rounded-sm object-cover" />
          <button type="button" onClick={() => onChange('')} className="text-xs text-stone-500 underline underline-offset-4">{removeLabel}</button>
        </div>
      ) : (
        <label className={`flex cursor-pointer items-center justify-center rounded-sm bg-stone-100 px-4 py-6 text-sm text-stone-600 ${busy ? 'opacity-50' : ''}`}>
          <input ref={input} type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
          {busy ? '…' : hint}
        </label>
      )}
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
