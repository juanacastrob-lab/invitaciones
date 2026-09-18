import type { ReactNode } from 'react';
import { SessionBar } from '@/components/auth/SessionBar';
import type { SessionProfile } from '@/lib/auth';

const NAV = [
  { href: '/admin/events', label: 'Eventos' },
  { href: '/admin/orders', label: 'Pedidos' },
  { href: '/admin/leads', label: 'Prospectos' },
  { href: '/admin/log', label: 'Bitácora' },
  { href: '/admin/pricing', label: 'Precios', admin: true },
  { href: '/admin/team', label: 'Equipo', admin: true },
];

export function AdminShell({ me, title, actions, children, current }: {
  me: SessionProfile;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  current?: string;
}) {
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <SessionBar me={me} />
      <nav className="border-b border-stone-200 bg-white px-6">
        <div className="mx-auto flex max-w-5xl gap-6 overflow-x-auto whitespace-nowrap text-xs uppercase tracking-[0.2em]">
          {NAV.filter((n) => !n.admin || me.role === 'admin').map((n) => (
            <a
              key={n.href}
              href={n.href}
              className={`border-b-2 py-3 ${current?.startsWith(n.href) ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-900'}`}
            >
              {n.label}
            </a>
          ))}
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-3xl">{title}</h1>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
