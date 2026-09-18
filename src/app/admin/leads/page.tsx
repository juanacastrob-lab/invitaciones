import { requireRole } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase/server';
import { SessionBar } from '@/components/auth/SessionBar';
import { whatsappLink } from '@/lib/config';

export const dynamic = 'force-dynamic';

/** Los prospectos que llegaron por la landing, del más nuevo al más viejo. */
export default async function LeadsPage() {
  const me = await requireRole('admin', 'staff');
  const supabase = await supabaseServer();

  const { data: leads } = await supabase
    .from('leads')
    .select('id, partner_a, partner_b, email, phone, country, language, event_date, city, guests_estimate, package_code, message, stage, utm_source, utm_campaign, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <SessionBar me={me} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-3xl">Prospectos</h1>
          <p className="text-xs text-stone-500">{leads?.length ?? 0}</p>
        </div>

        {!leads?.length ? (
          <p className="mt-6 text-sm text-stone-500">Todavía no llega ninguno. Cuando alguien llene el formulario de la portada, aparece aquí.</p>
        ) : (
          <ul className="mt-6 divide-y divide-stone-200">
            {leads.map((l) => (
              <li key={l.id} className="py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">
                    {l.partner_a} &amp; {l.partner_b}
                    <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-[0.65rem] uppercase tracking-widest text-stone-500">{l.stage}</span>
                  </p>
                  <p className="text-xs text-stone-400">{new Date(l.created_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</p>
                </div>
                <p className="mt-1 text-sm text-stone-600">
                  {l.country} · {l.language}
                  {l.event_date ? ` · ${l.event_date}` : ''}
                  {l.city ? ` · ${l.city}` : ''}
                  {l.guests_estimate ? ` · ~${l.guests_estimate} invitados` : ''}
                  {l.package_code ? ` · paquete ${l.package_code}` : ''}
                </p>
                {l.message ? <p className="mt-2 text-sm italic text-stone-500">“{l.message}”</p> : null}
                {l.utm_source || l.utm_campaign ? (
                  <p className="mt-1 text-xs text-stone-400">vía {l.utm_source ?? '?'}{l.utm_campaign ? ` · ${l.utm_campaign}` : ''}</p>
                ) : null}
                <div className="mt-2 flex gap-4 text-xs">
                  <a className="underline underline-offset-4" href={whatsappLink(`Hola ${l.partner_a}, soy de Hola Boda. Vi que llenaron el formulario para su invitación 🙂`, l.phone)} target="_blank" rel="noopener noreferrer">
                    WhatsApp {l.phone}
                  </a>
                  <a className="underline underline-offset-4" href={`mailto:${l.email}`}>{l.email}</a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
