'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { saveEventContent } from '@/actions/content';
import type { Locale } from '@/lib/config';
import { SECTION_IDS, type EventContent, type SectionId } from '@/schemas/event-content';
import { fromDraft, moveSection, newId, toDraft, toggleSection, type ActKind, type Draft } from '@/lib/editor/draft';
import { Button, LinkButton, Notice } from '@/components/ui';
import { AddButton, Check, Item, LTInput, SectionCard, Text } from './fields';
import { PhotoField } from './PhotoField';

const ACT_KINDS: ActKind[] = ['civil', 'religiosa', 'recepcion', 'otro'];

/**
 * Editor por secciones. Lo usan el equipo (admin) y los novios o el planner
 * (panel): mismo formulario, y la base decide si pueden guardar.
 */
export function ContentEditor({ eventId, content, languages, previewHref }: { eventId: string; content: EventContent; languages: Locale[]; previewHref: string }) {
  const t = useTranslations('editor');
  const [draft, setDraft] = useState<Draft>(() => toDraft(content));
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: true } | { ok: false; error: string; field?: string } | null>(null);

  const langs = languages.filter((l): l is Locale => l === 'es' || l === 'en');
  const labels = { show: t('show'), up: t('up'), down: t('down') };

  /** Cambia el borrador sin mutar el anterior. structuredClone es barato aquí. */
  const patch = (fn: (d: Draft) => void) => {
    setDraft((prev) => { const next = structuredClone(prev); fn(next); return next; });
    setDirty(true);
    setResult(null);
  };

  const save = () =>
    start(async () => {
      const r = await saveEventContent(eventId, fromDraft(draft));
      if (r.ok) { setDirty(false); setResult({ ok: true }); }
      else {
        setResult({ ok: false, error: r.error, field: r.field });
        const sec = r.field?.split('.')[0];
        document.getElementById(`sec-${sec}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

  const errorSection = result && !result.ok ? result.field?.split('.')[0] : undefined;
  const errorFor = (id: string) => (errorSection === id && result && !result.ok ? result.error : undefined);
  const sectionName = (id: string | undefined) => {
    if (!id) return '';
    if ((SECTION_IDS as readonly string[]).includes(id)) return t(`sections.${id as SectionId}`);
    if (id === 'couple' || id === 'startsAt') return t('basics.title');
    if (id === 'og') return t('og.title');
    if (id === 'saveTheDate') return t('saveTheDate.title');
    if (id === 'thankYou') return t('thankYou.title');
    return id;
  };

  const enabled = draft.sectionOrder;
  const disabled = SECTION_IDS.filter((id) => !enabled.includes(id));

  const cardProps = (id: SectionId) => ({
    id,
    title: t(`sections.${id}`),
    enabled: enabled.includes(id),
    onToggle: (on: boolean) => patch((d) => { d.sectionOrder = toggleSection(d.sectionOrder, id, on); }),
    onMove: (dir: -1 | 1) => patch((d) => { d.sectionOrder = moveSection(d.sectionOrder, id, dir); }),
    canUp: enabled.indexOf(id) > 0,
    canDown: enabled.indexOf(id) >= 0 && enabled.indexOf(id) < enabled.length - 1,
    labels,
    error: errorFor(id),
  });

  const lt = (label: string, value: { es: string; en: string }, set: (d: Draft, v: { es: string; en: string }) => void, extra?: { multiline?: boolean; hint?: string }) => (
    <LTInput label={label} value={value} langs={langs} onChange={(v) => patch((d) => set(d, v))} {...extra} />
  );

  const photoFields = (url: string, alt: { es: string; en: string }, setUrl: (d: Draft, v: string) => void, setAlt: (d: Draft, v: { es: string; en: string }) => void) => (
    <>
      <PhotoField label={t('fields.photo')} value={url} onChange={(v) => patch((d) => setUrl(d, v))} eventId={eventId} hint={t('photoHint')} />
      {url ? lt(t('photoAlt'), alt, setAlt) : null}
    </>
  );

  const renderSection = (id: SectionId) => {
    switch (id) {
      case 'cover':
        return (
          <SectionCard key={id} {...cardProps(id)}>
            {lt(t('fields.headline'), draft.cover.headline, (d, v) => { d.cover.headline = v; })}
            {lt(t('fields.tagline'), draft.cover.tagline, (d, v) => { d.cover.tagline = v; })}
            {photoFields(draft.cover.photoUrl, draft.cover.photoAlt, (d, v) => { d.cover.photoUrl = v; }, (d, v) => { d.cover.photoAlt = v; })}
            <Text label={t('fields.video')} value={draft.cover.video} onChange={(v) => patch((d) => { d.cover.video = v; })} hint={t('fields.videoHint')} placeholder="https://….mp4" />
            <Check label={t('fields.envelope')} checked={draft.cover.envelope} onChange={(v) => patch((d) => { d.cover.envelope = v; })} />
            <Check label={t('fields.monogram')} checked={draft.cover.monogram} onChange={(v) => patch((d) => { d.cover.monogram = v; })} />
          </SectionCard>
        );
      case 'quote':
        return (
          <SectionCard key={id} {...cardProps(id)}>
            {lt(t('fields.quoteText'), draft.quote.text, (d, v) => { d.quote.text = v; }, { multiline: true, hint: t('fields.quoteHint') })}
            <Text label={t('fields.author')} value={draft.quote.author} onChange={(v) => patch((d) => { d.quote.author = v; })} placeholder="1 Corintios 13:4" />
          </SectionCard>
        );
      case 'parents':
        return (
          <SectionCard key={id} {...cardProps(id)}>
            {lt(t('fields.sectionTitle'), draft.parents.title, (d, v) => { d.parents.title = v; })}
            {draft.parents.groups.map((g, i) => (
              <Item key={i} title={`${t('fields.group')} ${i + 1}`} removeLabel={t('remove')} onRemove={() => patch((d) => { d.parents.groups.splice(i, 1); })}>
                {lt(t('fields.groupTitle'), g.title, (d, v) => { d.parents.groups[i].title = v; })}
                <label className="block">
                  <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{t('fields.names')}</span>
                  <textarea value={g.names} onChange={(e) => patch((d) => { d.parents.groups[i].names = e.target.value; })} className="min-h-20 w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm" placeholder={t('fields.namesPlaceholder')} />
                </label>
              </Item>
            ))}
            <AddButton label={t('fields.group')} onClick={() => patch((d) => { d.parents.groups.push({ title: { es: '', en: '' }, names: '' }); })} />
          </SectionCard>
        );
      case 'countdown':
        return (
          <SectionCard key={id} {...cardProps(id)}>
            {lt(t('fields.label'), draft.countdown.label, (d, v) => { d.countdown.label = v; })}
          </SectionCard>
        );
      case 'story':
        return (
          <SectionCard key={id} {...cardProps(id)}>
            {lt(t('fields.sectionTitle'), draft.story.title, (d, v) => { d.story.title = v; })}
            {lt(t('fields.body'), draft.story.body, (d, v) => { d.story.body = v; }, { multiline: true })}
            {photoFields(draft.story.photoUrl, draft.story.photoAlt, (d, v) => { d.story.photoUrl = v; }, (d, v) => { d.story.photoAlt = v; })}
          </SectionCard>
        );
      case 'itinerary':
        return (
          <SectionCard key={id} {...cardProps(id)}>
            {lt(t('fields.sectionTitle'), draft.itinerary.title, (d, v) => { d.itinerary.title = v; })}
            {draft.itinerary.acts.map((a, i) => (
              <Item key={a.id} title={`${t('fields.act')} ${i + 1}`} removeLabel={t('remove')} onRemove={() => patch((d) => { d.itinerary.acts.splice(i, 1); })}>
                <label className="block">
                  <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{t('fields.kind')}</span>
                  <select value={a.kind} onChange={(e) => patch((d) => { d.itinerary.acts[i].kind = e.target.value as ActKind; })} className="w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm">
                    {ACT_KINDS.map((k) => <option key={k} value={k}>{t(`fields.kinds.${k}`)}</option>)}
                  </select>
                </label>
                {lt(t('fields.name'), a.title, (d, v) => { d.itinerary.acts[i].title = v; })}
                <Text label={t('fields.startsAt')} type="datetime-local" value={a.startsAt} onChange={(v) => patch((d) => { d.itinerary.acts[i].startsAt = v; })} />
                <Text label={t('fields.venueName')} value={a.venueName} onChange={(v) => patch((d) => { d.itinerary.acts[i].venueName = v; })} />
                <Text label={t('fields.address')} value={a.address} onChange={(v) => patch((d) => { d.itinerary.acts[i].address = v; })} />
                <div className="grid grid-cols-2 gap-3">
                  <Text label={t('fields.lat')} value={a.lat} onChange={(v) => patch((d) => { d.itinerary.acts[i].lat = v; })} placeholder="18.98" />
                  <Text label={t('fields.lng')} value={a.lng} onChange={(v) => patch((d) => { d.itinerary.acts[i].lng = v; })} placeholder="-99.09" />
                </div>
                <p className="text-xs text-stone-400">{t('fields.coordsHint')}</p>
                {lt(t('fields.note'), a.note, (d, v) => { d.itinerary.acts[i].note = v; })}
              </Item>
            ))}
            <AddButton label={t('fields.act')} onClick={() => patch((d) => { d.itinerary.acts.push({ id: newId('act'), kind: 'recepcion', title: { es: '', en: '' }, startsAt: d.startsAt, venueName: '', address: '', lat: '', lng: '', note: { es: '', en: '' } }); })} />
          </SectionCard>
        );
      case 'dressCode':
        return (
          <SectionCard key={id} {...cardProps(id)}>
            {lt(t('fields.sectionTitle'), draft.dressCode.title, (d, v) => { d.dressCode.title = v; })}
            {lt(t('fields.code'), draft.dressCode.code, (d, v) => { d.dressCode.code = v; }, { hint: t('fields.codeHint') })}
            {lt(t('fields.notes'), draft.dressCode.notes, (d, v) => { d.dressCode.notes = v; }, { multiline: true })}
            <div>
              <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{t('fields.palette')}</span>
              <div className="flex flex-wrap items-center gap-2">
                {draft.dressCode.palette.map((c, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(c) ? c : '#000000'} onChange={(e) => patch((d) => { d.dressCode.palette[i] = e.target.value; })} className="h-8 w-10 cursor-pointer border border-stone-200 bg-white" />
                    <button type="button" aria-label={t('remove')} onClick={() => patch((d) => { d.dressCode.palette.splice(i, 1); })} className="text-xs text-stone-400">×</button>
                  </span>
                ))}
                {draft.dressCode.palette.length < 6 ? <AddButton label={t('fields.color')} onClick={() => patch((d) => { d.dressCode.palette.push('#8a7a6a'); })} /> : null}
              </div>
            </div>
          </SectionCard>
        );
      case 'noKids':
        return (
          <SectionCard key={id} {...cardProps(id)}>
            {lt(t('fields.note'), draft.noKids.note, (d, v) => { d.noKids.note = v; }, { multiline: true })}
          </SectionCard>
        );
      case 'gifts':
        return (
          <SectionCard key={id} {...cardProps(id)}>
            {lt(t('fields.sectionTitle'), draft.gifts.title, (d, v) => { d.gifts.title = v; })}
            {lt(t('fields.note'), draft.gifts.note, (d, v) => { d.gifts.note = v; }, { multiline: true })}
            {draft.gifts.links.map((l, i) => (
              <Item key={i} title={`${t('fields.link')} ${i + 1}`} removeLabel={t('remove')} onRemove={() => patch((d) => { d.gifts.links.splice(i, 1); })}>
                {lt(t('fields.linkLabel'), l.label, (d, v) => { d.gifts.links[i].label = v; })}
                <Text label={t('fields.url')} value={l.url} onChange={(v) => patch((d) => { d.gifts.links[i].url = v; })} placeholder="https://…" />
              </Item>
            ))}
            <AddButton label={t('fields.link')} onClick={() => patch((d) => { d.gifts.links.push({ label: { es: '', en: '' }, url: '' }); })} />
            <div className="space-y-3 rounded-sm border border-stone-100 bg-stone-50 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{t('fields.bank')}</p>
              <p className="text-xs text-stone-400">{t('fields.bankHint')}</p>
              <Text label={t('fields.bankName')} value={draft.gifts.bank.bank} onChange={(v) => patch((d) => { d.gifts.bank.bank = v; })} />
              <Text label={t('fields.holder')} value={draft.gifts.bank.holder} onChange={(v) => patch((d) => { d.gifts.bank.holder = v; })} />
              <Text label={t('fields.clabe')} value={draft.gifts.bank.clabe} onChange={(v) => patch((d) => { d.gifts.bank.clabe = v; })} />
              <Text label={t('fields.account')} value={draft.gifts.bank.account} onChange={(v) => patch((d) => { d.gifts.bank.account = v; })} />
              {lt(t('fields.note'), draft.gifts.bank.note, (d, v) => { d.gifts.bank.note = v; })}
            </div>
            <Check label={t('fields.envelopes')} checked={draft.gifts.envelopes} onChange={(v) => patch((d) => { d.gifts.envelopes = v; })} />
          </SectionCard>
        );
      case 'lodging':
        return (
          <SectionCard key={id} {...cardProps(id)}>
            {lt(t('fields.sectionTitle'), draft.lodging.title, (d, v) => { d.lodging.title = v; })}
            {draft.lodging.options.map((o, i) => (
              <Item key={i} title={`${t('fields.option')} ${i + 1}`} removeLabel={t('remove')} onRemove={() => patch((d) => { d.lodging.options.splice(i, 1); })}>
                <Text label={t('fields.name')} value={o.name} onChange={(v) => patch((d) => { d.lodging.options[i].name = v; })} />
                {lt(t('fields.note'), o.note, (d, v) => { d.lodging.options[i].note = v; })}
                <Text label={t('fields.url')} value={o.url} onChange={(v) => patch((d) => { d.lodging.options[i].url = v; })} placeholder="https://…" />
                <Text label={t('fields.phone')} value={o.phone} onChange={(v) => patch((d) => { d.lodging.options[i].phone = v; })} />
              </Item>
            ))}
            <AddButton label={t('fields.option')} onClick={() => patch((d) => { d.lodging.options.push({ name: '', note: { es: '', en: '' }, url: '', phone: '' }); })} />
          </SectionCard>
        );
      case 'gallery':
        return (
          <SectionCard key={id} {...cardProps(id)}>
            {lt(t('fields.sectionTitle'), draft.gallery.title, (d, v) => { d.gallery.title = v; })}
            {draft.gallery.photos.map((p, i) => (
              <Item key={i} title={`${t('fields.photo')} ${i + 1}`} removeLabel={t('remove')} onRemove={() => patch((d) => { d.gallery.photos.splice(i, 1); })}>
                <PhotoField label={t('fields.photo')} value={p.url} onChange={(v) => patch((d) => { d.gallery.photos[i].url = v; })} eventId={eventId} />
                {lt(t('photoAlt'), p.alt, (d, v) => { d.gallery.photos[i].alt = v; })}
              </Item>
            ))}
            <AddButton label={t('fields.photo')} onClick={() => patch((d) => { d.gallery.photos.push({ url: '', alt: { es: '', en: '' } }); })} />
          </SectionCard>
        );
      case 'music':
        return (
          <SectionCard key={id} {...cardProps(id)}>
            <Text label={t('fields.musicUrl')} value={draft.music.url} onChange={(v) => patch((d) => { d.music.url = v; })} hint={t('fields.musicHint')} placeholder="https://…" />
            <Text label={t('fields.songTitle')} value={draft.music.title} onChange={(v) => patch((d) => { d.music.title = v; })} />
            <Text label={t('fields.artist')} value={draft.music.artist} onChange={(v) => patch((d) => { d.music.artist = v; })} />
          </SectionCard>
        );
      case 'faq':
        return (
          <SectionCard key={id} {...cardProps(id)}>
            {lt(t('fields.sectionTitle'), draft.faq.title, (d, v) => { d.faq.title = v; })}
            {draft.faq.items.map((it, i) => (
              <Item key={i} title={`${t('fields.question')} ${i + 1}`} removeLabel={t('remove')} onRemove={() => patch((d) => { d.faq.items.splice(i, 1); })}>
                {lt(t('fields.question'), it.q, (d, v) => { d.faq.items[i].q = v; })}
                {lt(t('fields.answer'), it.a, (d, v) => { d.faq.items[i].a = v; }, { multiline: true })}
              </Item>
            ))}
            <AddButton label={t('fields.question')} onClick={() => patch((d) => { d.faq.items.push({ q: { es: '', en: '' }, a: { es: '', en: '' } }); })} />
          </SectionCard>
        );
      case 'rsvp':
        return (
          <SectionCard key={id} {...cardProps(id)}>
            {lt(t('fields.sectionTitle'), draft.rsvp.title, (d, v) => { d.rsvp.title = v; })}
            {lt(t('fields.note'), draft.rsvp.note, (d, v) => { d.rsvp.note = v; }, { multiline: true })}
            <Check label={t('fields.askMenu')} checked={draft.rsvp.askMenu} onChange={(v) => patch((d) => { d.rsvp.askMenu = v; })} />
            {draft.rsvp.askMenu ? (
              <div className="space-y-3 pl-6">
                {draft.rsvp.menuOptions.map((m, i) => (
                  <Item key={m.id} title={`${t('fields.menuOption')} ${i + 1}`} removeLabel={t('remove')} onRemove={() => patch((d) => { d.rsvp.menuOptions.splice(i, 1); })}>
                    {lt(t('fields.name'), m.label, (d, v) => { d.rsvp.menuOptions[i].label = v; })}
                  </Item>
                ))}
                <AddButton label={t('fields.menuOption')} onClick={() => patch((d) => { d.rsvp.menuOptions.push({ id: newId('menu'), label: { es: '', en: '' } }); })} />
              </div>
            ) : null}
            <Check label={t('fields.askDietary')} checked={draft.rsvp.askDietary} onChange={(v) => patch((d) => { d.rsvp.askDietary = v; })} />
            <Check label={t('fields.askSong')} checked={draft.rsvp.askSong} onChange={(v) => patch((d) => { d.rsvp.askSong = v; })} />
            <Check label={t('fields.askMessage')} checked={draft.rsvp.askMessage} onChange={(v) => patch((d) => { d.rsvp.askMessage = v; })} />
          </SectionCard>
        );
    }
  };

  const bar = (
    <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-2 bg-stone-50/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0">
      <Button type="button" disabled={pending || !dirty} onClick={save}>{pending ? t('saving') : t('save')}</Button>
      <LinkButton href={previewHref} target="_blank">{t('preview')}</LinkButton>
      {dirty && !pending ? <span className="text-xs text-amber-700">{t('unsaved')}</span> : null}
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-stone-500">{t('intro')}</p>
      {bar}
      {result ? (
        <Notice kind={result.ok ? 'ok' : 'error'}>
          {result.ok ? t('saved') : t('errorAt', { section: sectionName(errorSection), message: result.error })}
        </Notice>
      ) : null}

      <SectionCard id="couple" title={t('basics.title')} enabled labels={labels} error={errorFor('couple') ?? errorFor('startsAt')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Text label={t('basics.partnerA')} value={draft.couple.partnerA} onChange={(v) => patch((d) => { d.couple.partnerA = v; })} />
          <Text label={t('basics.partnerB')} value={draft.couple.partnerB} onChange={(v) => patch((d) => { d.couple.partnerB = v; })} />
        </div>
        <Text label={t('basics.startsAt')} type="datetime-local" value={draft.startsAt} onChange={(v) => patch((d) => { d.startsAt = v; })} hint={t('basics.startsAtHint')} />
      </SectionCard>

      {enabled.map(renderSection)}
      {disabled.map(renderSection)}

      <SectionCard id="og" title={t('og.title')} enabled labels={labels} error={errorFor('og')}>
        <p className="text-xs text-stone-400">{t('og.hint')}</p>
        {lt(t('og.ogTitle'), draft.og.title, (d, v) => { d.og.title = v; })}
        {lt(t('og.description'), draft.og.description, (d, v) => { d.og.description = v; })}
        <PhotoField label={t('og.image')} value={draft.og.image} onChange={(v) => patch((d) => { d.og.image = v; })} eventId={eventId} kind="og" hint={t('og.imageHint')} />
      </SectionCard>

      <SectionCard id="saveTheDate" title={t('saveTheDate.title')} enabled labels={labels} error={errorFor('saveTheDate')}>
        <p className="text-xs text-stone-400">{t('saveTheDate.hint')}</p>
        {lt(t('fields.note'), draft.saveTheDate.note, (d, v) => { d.saveTheDate.note = v; }, { multiline: true })}
      </SectionCard>

      <SectionCard id="thankYou" title={t('thankYou.title')} enabled labels={labels} error={errorFor('thankYou')}>
        <p className="text-xs text-stone-400">{t('thankYou.hint')}</p>
        {lt(t('fields.sectionTitle'), draft.thankYou.title, (d, v) => { d.thankYou.title = v; })}
        {lt(t('fields.body'), draft.thankYou.body, (d, v) => { d.thankYou.body = v; }, { multiline: true })}
        {photoFields(draft.thankYou.photoUrl, draft.thankYou.photoAlt, (d, v) => { d.thankYou.photoUrl = v; }, (d, v) => { d.thankYou.photoAlt = v; })}
      </SectionCard>

      {bar}
    </div>
  );
}
