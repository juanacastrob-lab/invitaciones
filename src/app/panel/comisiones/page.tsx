import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth';
import { myPlanner } from '@/lib/admin/queries';
import { supabaseServer } from '@/lib/supabase/server';
import { SessionBar } from '@/components/auth/SessionBar';
import { Badge } from '@/components/ui';
import { isLocale, DEFAULT_LOCALE, WHATSAPP_NUMBER, whatsappLink } from '@/lib/config';
import { getSiteUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** Lo que ve un planner: su link, sus pedidos y lo que se le debe. */
export default async function CommissionsPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const me = await requireRole('client', 'staff', 'admin');
  const { lang } = await searchParams;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: 'panel' });
  const planner = await myPlanner(me.userId);
  if (!planner) notFound();
  const supabase = await supabaseServer();
  const { data: orders } = await supabase
    .from('orders')
    .select('id, number, status, total, currency, commission_amount, commission_paid_at, contact, created_at')
    .eq('planner_id', planner.id)
    .order('created_at', { ascending: false });
  const rows = (orders ?? []).map((o) => ({ ...o, total: Number(o.total), commission_amount: Number(o.commission_amount) }));
  const fmt = (n: number, cur: string) => new Intl.NumberFormat(locale === 'es' ? 'es-MX' : 'en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
  const cur = rows[0]?.currency ?? 'MXN';
  const pendingAmt = rows.filter((o) => o.status === 'pagado' && !o.commission_paid_at).reduce((s, o) => s + o.commission_amount, 0);
  const paidAmt = rows.filter((o) => o.commission_paid_at).reduce((s, o) => s + o.commission_amount, 0);
  const link = `${getSiteUrl() ?? ''}/comprar?ref=${planner.code}`;

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <SessionBar me={me} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <a href={`/panel${lang ? `?lang=${lang}` : ''}`} className="text-xs uppercase tracking-[0.2em] text-stone-500 underline underline-offset-4">← {t('title')}</a>
        <h1 className="mb-1 mt-2 font-serif text-3xl">{t('commissions.title')}</h1>
        <p className="text-sm text-stone-600">{t('commissions.intro', { pct: planner.commission_pct })}</p>

        <section className="mt-6 rounded-sm border border-stone-200 bg-white p-4">
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{t('commissions.link')}</p>
          <p className="mt-1 break-all font-medium">{link}</p>
          <a href={whatsappLink(t('commissions.share', { link }))} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex rounded-full bg-[#25D366] px-4 py-2 text-xs font-medium text-white">{t('commissions.shareButton')}</a>
        </section>

        <dl className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-sm border border-stone-200 bg-white p-4"><dt className="text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{t('commissions.pending')}</dt><dd className="mt-1 font-serif text-3xl">{fmt(pendingAmt, cur)}</dd></div>
          <div className="rounded-sm border border-stone-200 bg-white p-4"><dt className="text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">{t('commissions.paid')}</dt><dd className="mt-1 font-serif text-3xl">{fmt(paidAmt, cur)}</dd></div>
        </dl>

        <ul className="mt-6 divide-y divide-stone-200 rounded-sm border border-stone-200 bg-white text-sm">
          {rows.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span>#{o.number} · {(o.contact as { partner_a: string }).partner_a} · {o.created_at.slice(0, 10)} · <Badge tone={o.status === 'pagado' ? 'green' : 'amber'}>{o.status}</Badge></span>
              <span><strong>{fmt(o.commission_amount, o.currency)}</strong> {o.commission_paid_at ? <Badge tone="green">{t('commissions.paidBadge')}</Badge> : o.status === 'pagado' ? <Badge tone="amber">{t('commissions.pendingBadge')}</Badge> : null}</span>
            </li>
          ))}
          {!rows.length ? <li className="p-6 text-center text-stone-500">{t('commissions.none')}</li> : null}
        </ul>
        <p className="mt-4 text-xs text-stone-500">{t('commissions.payout')} <a className="underline" href={whatsappLink('Hola, soy planner, sobre mis comisiones.')} target="_blank" rel="noopener noreferrer">{WHATSAPP_NUMBER}</a></p>
      </main>
    </div>
  );
}
