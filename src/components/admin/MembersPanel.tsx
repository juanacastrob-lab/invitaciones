'use client';

import { useState, useTransition } from 'react';
import { addMember, removeMember } from '@/actions/admin-members';
import type { ActionResult } from '@/schemas/admin';
import { Button, Input, Notice } from '@/components/ui';

export function MembersPanel({ eventId, members }: {
  eventId: string;
  members: { id: string; email: string; accepted_at: string | null }[];
}) {
  const [pending, start] = useTransition();
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <div className="space-y-3">
      <ul className="space-y-1 text-sm">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2">
            <span className="truncate">{m.email} <span className="text-xs text-stone-400">{m.accepted_at ? '· con acceso' : '· pendiente de entrar'}</span></span>
            <Button variant="ghost" className="text-red-700" disabled={pending} onClick={() => { if (confirm(`¿Quitar acceso a ${m.email}?`)) start(async () => setResult(await removeMember(eventId, m.id))); }}>Quitar</Button>
          </li>
        ))}
        {!members.length ? <li className="text-xs text-stone-500">Nadie todavía. Agrega el correo de los novios.</li> : null}
      </ul>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await addMember(eventId, email); setResult(r); if (r.ok) setEmail(''); }); }}>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="novios@correo.com" required />
        <Button type="submit" variant="secondary" disabled={pending}>Dar acceso</Button>
      </form>
      {result ? <Notice kind={result.ok ? 'ok' : 'error'}>{result.ok ? result.message : result.error}</Notice> : null}
    </div>
  );
}
