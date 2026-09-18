import type { ComponentProps, ReactNode } from 'react';

/**
 * Piezas mínimas de interfaz para el panel. Deliberadamente simples: el
 * panel lo usa el equipo, no los invitados. Si más adelante se instala
 * shadcn/ui, estos son los únicos archivos que hay que reemplazar.
 */

const base = 'inline-flex items-center justify-center gap-2 rounded-full text-xs uppercase tracking-[0.18em] transition-colors disabled:opacity-50';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const styles = {
    primary: 'bg-stone-900 px-4 py-2.5 text-white hover:bg-stone-800',
    secondary: 'border border-stone-300 px-4 py-2.5 text-stone-700 hover:border-stone-500',
    danger: 'border border-red-200 px-4 py-2.5 text-red-700 hover:bg-red-50',
    ghost: 'px-2 py-1 text-stone-500 hover:text-stone-900',
  }[variant];
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

export function LinkButton({
  variant = 'secondary',
  className = '',
  ...props
}: ComponentProps<'a'> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  const styles = {
    primary: 'bg-stone-900 px-4 py-2.5 text-white hover:bg-stone-800',
    secondary: 'border border-stone-300 px-4 py-2.5 text-stone-700 hover:border-stone-500',
    ghost: 'px-2 py-1 text-stone-500 hover:text-stone-900',
  }[variant];
  return <a className={`${base} ${styles} ${className}`} {...props} />;
}

export const inputClass =
  'w-full rounded-sm border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-600 focus:outline-none disabled:bg-stone-50';

export function Input({ className = '', ...props }: ComponentProps<'input'>) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}

export function Select({ className = '', ...props }: ComponentProps<'select'>) {
  return <select className={`${inputClass} ${className}`} {...props} />;
}

export function Textarea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return <textarea className={`${inputClass} min-h-24 ${className}`} {...props} />;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-stone-400">{hint}</span> : null}
    </label>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue'; children: ReactNode }) {
  const styles = {
    neutral: 'bg-stone-100 text-stone-600',
    green: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-800',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-sky-50 text-sky-800',
  }[tone];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[0.65rem] uppercase tracking-widest ${styles}`}>{children}</span>;
}

export function Notice({ kind, children }: { kind: 'ok' | 'error'; children: ReactNode }) {
  return (
    <p
      role={kind === 'error' ? 'alert' : 'status'}
      className={`rounded-sm px-3 py-2 text-sm ${kind === 'ok' ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'}`}
    >
      {children}
    </p>
  );
}
