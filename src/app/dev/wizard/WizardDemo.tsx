'use client';

import { useState } from 'react';
import { DesignStep } from '@/components/store/DesignStep';
import { DetailsStep } from '@/components/store/DetailsStep';
import { draftData, type DraftData } from '@/lib/drafts';

export function WizardDemo({ step, fontClasses = '' }: { step: 'design' | 'details'; fontClasses?: string }) {
  const [d, setD] = useState<DraftData>(() => draftData.parse({ template: 'jardin', partnerA: 'Ana', partnerB: 'Luis', headline: 'Nos casamos', date: '2027-03-13', acts: [{ kind: 'religiosa', title: 'Ceremonia religiosa', time: '17:00', venue: 'Parroquia de la Natividad', address: 'Centro, Tepoztlán', mapsUrl: '' }, { kind: 'recepcion', title: 'Recepción', time: '20:00', venue: '', address: '', mapsUrl: '' }] }));
  const [contact, setContact] = useState({ email: '', phone: '', country: 'MX' });
  const set = (patch: Partial<DraftData>) => setD((x) => ({ ...x, ...patch }));
  return step === 'design' ? <DesignStep d={d} set={set} locale="es" fontClasses={fontClasses} /> : <DetailsStep d={d} set={set} draftKey="demo" eventType="boda" contact={contact} setContact={setContact} express />;
}
