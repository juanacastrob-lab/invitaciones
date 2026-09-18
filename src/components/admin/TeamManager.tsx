'use client';

import { useState, useTransition } from 'react';
import { inviteStaff, setRole, cancelInvite } from '@/actions/admin-team';
import type { InviteRow, ProfileRow } from '@/lib/admin/queries';
import type { ActionResult } from '@/schemas/admin';
import { Badge, Button, Input, Notice } from '@/components/ui';

const ROLE_LABEL = { admin: 'Admin', staff: 'Equipo', client: 'Cliente' } as const;
const ROLE_TONE = { admin: 'blue', staff: 'green', client: 'neutral' } as const;

export function TeamManager({ me, profiles, invites }: { me: string; profiles: ProfileRow[]; invites: InviteRow[] }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [email, setEmail] = useState('');
  const [q, setQ] = useState('');
  const run = (fn: () => Promise<ActionResult>) => start(async () => setResult(await fn()));

  const team = profiles.filter((p) => p.role !== 'client');
  const clients = profiles.filter((p) => p.role === 'client' && (!q.trim() || `${p.email ?? ''} ${p.name ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <div className="space-y-8">
      <section className="rounded-sm border border-stone-200 bg-white p-5">
        <h2 className="mb-1 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Invitar al equipo</h2>
        <p className="mb-3 text-xs text-stone-500">Escribe su correo. Cuando entre con Google o con el link del correo, queda como <strong>Equipo</strong>: maneja eventos, invitados, envíos, pedidos y prospectos. No puede borrar eventos, cambiar precios ni tocar el equipo.</p>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await inviteStaff(email); if (r.ok) setEmail(''); return r; }); }}>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
          <Button type="submit" disabled={pending} className="shrink-0">Invitar</Button>
        </form>
        {result ? <div className="mt-3"><Notice kind={result.ok ? 'ok' : 'error'}>{result.ok ? result.message : result.error}</Notice></div> : null}
      </section>

      {invites.length ? (
        <section>
          <h2 className="mb-2 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Pendientes de entrar</h2>
          <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span>{i.email}</span>
                <Button variant="ghost" disabled={pending} onClick={() => run(() => cancelInvite(i.id))}>Cancelar</Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Equipo</h2>
        <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
          {team.map((p) => (
            <li key={p.user_id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div>
                <p>{p.name || p.email}{p.user_id === me ? ' (tú)' : ''}</p>
                <p className="text-xs text-stone-500">{p.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={ROLE_TONE[p.role]}>{ROLE_LABEL[p.role]}</Badge>
                {p.role === 'staff' ? <Button variant="ghost" disabled={pending} onClick={() => { if (window.confirm(`¿Quitar del equipo a ${p.email}? Queda como cliente.`)) run(() => setRole(p.user_id, 'client')); }}>Quitar</Button> : null}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-stone-400">Los admin solo se nombran por SQL, nunca desde aquí.</p>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[0.7rem] uppercase tracking-[0.25em] text-stone-500">Clientes ({profiles.filter((p) => p.role === 'client').length})</h2>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className="w-48" />
        </div>
        <ul className="divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white">
          {clients.slice(0, 50).map((p) => (
            <li key={p.user_id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div>
                <p>{p.name || p.email}</p>
                <p className="text-xs text-stone-500">{p.email} · {p.created_at.slice(0, 10)}</p>
              </div>
              <Button variant="ghost" disabled={pending} onClick={() => { if (window.confirm(`¿Hacer parte del equipo a ${p.email}?`)) run(() => setRole(p.user_id, 'staff')); }}>Hacer equipo</Button>
            </li>
          ))}
          {!clients.length ? <li className="p-4 text-center text-xs text-stone-500">Sin clientes.</li> : null}
        </ul>
      </section>
    </div>
  );
}
