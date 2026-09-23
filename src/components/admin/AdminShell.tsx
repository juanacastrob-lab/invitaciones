import type { ReactNode } from 'react';
import { SessionBar } from '@/components/auth/SessionBar';
import type { SessionProfile } from '@/lib/auth';

const NAV = [
  { href: '/admin', label: 'Inicio', exact: true },
  { href: '/admin/leads', label: 'Prospectos' },
  { href: '/admin/inbox', label: 'WhatsApp' },
  { href: '/admin/events', label: 'Eventos' },
  { href: '/admin/orders', label: 'Pedidos' },
  { href: '/admin/funnel', label: 'Embudo' },
  { href: '/admin/reviews', label: 'Reseñas' },
  { href: '/admin/log', label: 'Bitácora' },
  { href: '/admin/pricing', label: 'Precios', admin: true },
  { href: '/admin/team', label: 'Equipo', admin: true },
  { href: '/admin/planners', label: 'Planners', admin: true },
];

export function AdminShell({ me, title, actions, children, current, unread = 0 }: {
  me: SessionProfile;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  current?: string;
  /** Mensajes de WhatsApp sin leer: puntito en la pestaña. */
  unread?: number;
}) {
  const active = (n: { href: string; exact?: boolean }) => (n.exact ? current === n.href : Boolean(current?.startsWith(n.href)));
  const dot = (n: { href: string }) => (n.href === '/admin/inbox' && unread > 0 ? <span className="ml-1 inline-block rounded-full bg-red-600 px-1.5 text-[0.55rem] text-white">{unread}</span> : null);
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <SessionBar me={me} />
      <nav className="hidden border-b border-stone-200 bg-white px-6 sm:block">
        <div className="mx-auto flex max-w-5xl gap-6 overflow-x-auto whitespace-nowrap text-xs uppercase tracking-[0.2em]">
          {NAV.filter((n) => !n.admin || me.role === 'admin').map((n) => (
            <a
              key={n.href}
              href={n.href}
              className={`border-b-2 py-3 ${active(n) ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-900'}`}
            >
              {n.label}{dot(n)}
            </a>
          ))}
        </div>
      </nav>
      {/* Celular: barra inferior fija, al alcance del pulgar; el resto de pestañas en "Más". */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="grid grid-cols-4 text-[0.6rem] uppercase tracking-[0.15em]">
          {NAV.slice(0, 3).map((n) => (
            <a key={n.href} href={n.href} className={`flex flex-col items-center gap-1 py-2.5 ${active(n) ? 'text-stone-900' : 'text-stone-500'}`}>
              <span className={`h-1 w-6 rounded-full ${active(n) ? 'bg-stone-900' : 'bg-transparent'}`} />
              <span>{n.label}{dot(n)}</span>
            </a>
          ))}
          <details className="group relative">
            <summary className="flex cursor-pointer list-none flex-col items-center gap-1 py-2.5 text-stone-500"><span className="h-1 w-6" />Más</summary>
            <div className="absolute bottom-full right-2 mb-2 w-44 rounded-sm border border-stone-200 bg-white py-1 shadow-lg">
              {NAV.slice(3).filter((n) => !n.admin || me.role === 'admin').map((n) => (
                <a key={n.href} href={n.href} className={`block px-4 py-2.5 text-xs uppercase tracking-[0.15em] ${active(n) ? 'text-stone-900' : 'text-stone-600'}`}>{n.label}</a>
              ))}
            </div>
          </details>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-3xl">{title}</h1>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
