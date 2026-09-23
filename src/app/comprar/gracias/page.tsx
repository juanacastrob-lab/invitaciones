import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { APP_NAME, DEFAULT_LOCALE, isLocale, whatsappLink } from '@/lib/config';
import { stripe, stripeConfig } from '@/lib/stripe';
import { isExpress } from '@/lib/drafts';
import { WhatsAppIcon } from '@/components/landing/LeadForm';
import { FunnelPing } from '@/components/FunnelPing';

export const metadata: Metadata = { title: `Gracias · ${APP_NAME}`, robots: { index: false } };
export const dynamic = 'force-dynamic';

/** Regreso de Stripe. Con tarjeta ya está pagado; con OXXO/SPEI queda esperando al banco. */
export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ session_id?: string; lang?: string }> }) {
  const { session_id, lang } = await searchParams;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: 'store' });
  let info: { number: string; paid: boolean; express: boolean; total: number; currency: string; email: string } | null = null;
  if (session_id && stripeConfig() && /^cs_[A-Za-z0-9_]+$/.test(session_id)) {
    try {
      const s = await stripe().checkout.sessions.retrieve(session_id);
      info = { number: s.metadata?.order_number ?? '', paid: s.payment_status === 'paid', express: isExpress(s.metadata?.package_code ?? ''), total: (s.amount_total ?? 0) / 100, currency: (s.currency ?? 'mxn').toUpperCase(), email: s.customer_details?.email ?? '' };
    } catch (e) {
      console.warn('[gracias] sesión de Stripe:', (e as Error).message);
    }
  }
  const msg = locale === 'en' ? `Hi! I just paid order #${info?.number ?? ''} on holaboda.` : `¡Hola! Acabo de pagar el pedido #${info?.number ?? ''} en holaboda.`;
  return (
    <div className="min-h-dvh bg-[#faf8f5] text-stone-900">
      <main className="mx-auto max-w-xl px-5 py-16">
        <div className="rounded-sm border border-stone-200 bg-white p-6 text-center" role="status">
          {info ? (
            <>
              <p className="font-serif text-3xl">{t(info.paid ? 'done.paid' : 'done.awaiting', { number: info.number })}</p>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">{t(info.paid ? (info.express ? 'done.paidExpressBody' : 'done.paidBody') : 'done.awaitingBody')}</p>
              <p className="mt-4 text-xs text-stone-500">{t('done.email')}</p>
              <FunnelPing step={info.paid ? 'paid' : 'order_created'} meta={{ value: info.total, currency: info.currency }} />
            </>
          ) : (
            <p className="text-sm text-stone-600">{t('done.awaitingBody')}</p>
          )}
          <a href={whatsappLink(msg)} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-medium text-white">
            <WhatsAppIcon /> {t('done.whatsapp')}
          </a>
          <p className="mt-6"><a href="/login" className="text-xs uppercase tracking-[0.2em] text-stone-600 underline underline-offset-4">{t('done.goPanel')}</a></p>
        </div>
      </main>
    </div>
  );
}
