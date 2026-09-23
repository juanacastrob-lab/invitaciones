'use client';

import { useTranslations } from 'next-intl';
import { PALETTES, TEMPLATE_IDS, TEMPLATES, resolveTemplate, type TemplateId } from '@/templates/registry';
import type { DraftData } from '@/lib/drafts';
import type { Locale } from '@/lib/config';
import { FONT_IDS, FONTS, fontCss } from '@/lib/fonts';

/** Diseño y colores, con una tarjeta chica que cambia al instante. */
export function DesignStep({ d, set, locale, fontClasses = '' }: { d: DraftData; set: (patch: Partial<DraftData>) => void; locale: Locale; /** Variables CSS de las fuentes (vienen del servidor). */ fontClasses?: string }) {
  const t = useTranslations('store');
  const th = resolveTemplate(d.template, d.colors);
  const custom = Object.values(d.colors).some(Boolean) && !PALETTES.some((p) => p.paper === d.colors.paper && p.ink === d.colors.ink && p.accent === d.colors.accent);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="mb-1 font-serif text-2xl">{t('wizard.design.title')}</h2>
        <p className="mb-3 text-sm text-stone-500">{t('wizard.design.body')}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {TEMPLATE_IDS.map((id) => {
            const tp = TEMPLATES[id];
            return (
              <button key={id} type="button" onClick={() => set({ template: id as TemplateId, colors: {} })} aria-pressed={d.template === id}
                className={`rounded-sm border p-2 text-left ${d.template === id ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-200'}`}>
                <span className="flex h-14 items-end justify-center rounded-sm p-1" style={{ background: tp.colors.paper, color: tp.colors.ink }}>
                  <span className={`${tp.heading === 'serif' ? 'font-serif' : 'font-sans'} text-lg`} style={{ color: tp.colors.accent }}>A&amp;L</span>
                </span>
                <span className="mt-1 block text-xs font-medium">{tp.name[locale]}</span>
                <span className="block text-[0.65rem] leading-tight text-stone-500">{tp.description[locale]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-1 font-serif text-2xl">{t('wizard.design.colors')}</h2>
        <p className="mb-3 text-sm text-stone-500">{t('wizard.design.colorsBody')}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => set({ colors: {} })} aria-pressed={!Object.values(d.colors).some(Boolean)} className={`rounded-full border px-3 py-1.5 text-xs ${!Object.values(d.colors).some(Boolean) ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300'}`}>{t('wizard.design.original')}</button>
          {PALETTES.map((p) => {
            const on = d.colors.paper === p.paper && d.colors.ink === p.ink && d.colors.accent === p.accent;
            return (
              <button key={p.id} type="button" onClick={() => set({ colors: { paper: p.paper, ink: p.ink, accent: p.accent } })} aria-pressed={on}
                className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs ${on ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-300'}`}>
                <span className="flex overflow-hidden rounded-full border border-stone-200"><span className="h-4 w-4" style={{ background: p.paper }} /><span className="h-4 w-4" style={{ background: p.accent }} /><span className="h-4 w-4" style={{ background: p.ink }} /></span>
                {p.name[locale]}
              </button>
            );
          })}
        </div>
        <details className="mt-3 text-xs text-stone-600" open={custom}>
          <summary className="cursor-pointer underline underline-offset-4">{t('wizard.design.custom')}</summary>
          <div className="mt-2 flex flex-wrap gap-4">
            {(['paper', 'ink', 'accent'] as const).map((k) => (
              <label key={k} className="flex items-center gap-2">
                <input type="color" value={d.colors[k] ?? th.colors[k]} onChange={(e) => set({ colors: { ...d.colors, [k]: e.target.value } })} className="h-8 w-10 cursor-pointer border border-stone-200 bg-white" />
                {t(`wizard.design.${k}`)}
              </label>
            ))}
          </div>
        </details>
      </div>

      <div>
        <h2 className="mb-1 font-serif text-2xl">{t('wizard.design.font')}</h2>
        <p className="mb-3 text-sm text-stone-500">{t('wizard.design.fontBody')}</p>
        <div className={`grid grid-cols-2 gap-2 sm:grid-cols-4 ${fontClasses}`}>
          {FONT_IDS.map((id) => (
            <button key={id} type="button" onClick={() => set({ font: id })} aria-pressed={(d.font || 'cormorant') === id}
              className={`rounded-sm border bg-white px-3 py-3 text-center ${(d.font || 'cormorant') === id ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-200'}`}>
              <span className="block text-2xl leading-none" style={{ fontFamily: FONTS[id].css }}>{d.partnerA || 'Ana'}</span>
              <span className="mt-1.5 block text-[0.6rem] uppercase tracking-widest text-stone-400">{FONTS[id].name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* muestra en vivo */}
      <div className={`rounded-sm border p-6 text-center ${fontClasses}`} style={{ background: th.colors.paper, color: th.colors.ink, borderColor: th.colors.line }}>
        <p className="text-[0.65rem] uppercase tracking-[0.3em]" style={{ color: th.colors.muted }}>{d.headline || t('wizard.design.sampleHeadline')}</p>
        <p className="mt-3 text-3xl" style={{ fontFamily: th.heading === 'serif' || d.font ? fontCss(d.font) : 'inherit' }}>{d.partnerA || 'Ana'}{d.partnerB || !d.partnerA ? <span style={{ color: th.colors.accent }}> &amp; </span> : null}{d.partnerB || (!d.partnerA ? 'Luis' : '')}</p>
        <p className="mt-3 text-[0.65rem] uppercase tracking-[0.25em]" style={{ color: th.colors.muted }}>{d.date || '2027-03-13'}</p>
        <span className="mt-4 inline-block rounded-full px-4 py-1.5 text-[0.65rem] uppercase tracking-[0.2em]" style={{ background: th.colors.accentSoft, color: th.colors.ink }}>{t('wizard.design.sampleButton')}</span>
      </div>
    </section>
  );
}
