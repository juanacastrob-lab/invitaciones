export function EventTabs({ id, current }: { id: string; current: 'datos' | 'contenido' | 'invitados' | 'mesas' | 'envio' }) {
  const tabs = [
    { key: 'datos', href: `/admin/events/${id}`, label: 'Datos' },
    { key: 'contenido', href: `/admin/events/${id}/content`, label: 'Contenido' },
    { key: 'invitados', href: `/admin/events/${id}/guests`, label: 'Invitados' },
    { key: 'mesas', href: `/admin/events/${id}/tables`, label: 'Mesas' },
    { key: 'envio', href: `/admin/events/${id}/send`, label: 'Envío por WhatsApp' },
  ] as const;
  return (
    <div className="mb-6 flex gap-2 overflow-x-auto border-b border-stone-200">
      {tabs.map((t) => (
        <a key={t.key} href={t.href} className={`-mb-px border-b-2 whitespace-nowrap px-3 py-2 text-xs uppercase tracking-[0.18em] ${current === t.key ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-900'}`}>
          {t.label}
        </a>
      ))}
    </div>
  );
}
