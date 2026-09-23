import 'server-only';
import Stripe from 'stripe';

/**
 * Stripe Checkout: la página de pago la pone Stripe (tarjeta, Apple Pay,
 * Google Pay y, en México, OXXO y SPEI según lo que actives en el Dashboard).
 * Sin STRIPE_SECRET_KEY la tienda usa el pago simulado.
 */
export function stripeConfig(): { secretKey: string; webhookSecret: string | null } | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) return null;
  return { secretKey, webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || null };
}

let client: Stripe | null = null;
export function stripe(): Stripe {
  const cfg = stripeConfig();
  if (!cfg) throw new Error('Stripe no configurado (STRIPE_SECRET_KEY).');
  if (!client) client = new Stripe(cfg.secretKey);
  return client;
}

/** Monto en centavos como lo pide Stripe (MXN, USD y CAD tienen 2 decimales). */
export function toMinor(amount: number): number {
  return Math.round(amount * 100);
}

export async function createCheckoutSession(input: {
  orderId: string;
  orderNumber: number;
  email: string;
  currency: string;
  lines: { name: string; amount: number }[];
  locale: 'es' | 'en';
  siteUrl: string;
  draftKey: string | null;
  packageCode: string;
}): Promise<{ url: string; id: string }> {
  const s = stripe();
  const session = await s.checkout.sessions.create({
    mode: 'payment',
    customer_email: input.email,
    locale: input.locale,
    line_items: input.lines.map((l) => ({ quantity: 1, price_data: { currency: input.currency.toLowerCase(), unit_amount: toMinor(l.amount), product_data: { name: l.name } } })),
    metadata: { order_id: input.orderId, order_number: String(input.orderNumber), package_code: input.packageCode },
    client_reference_id: input.orderId,
    success_url: `${input.siteUrl}/comprar/gracias?session_id={CHECKOUT_SESSION_ID}${input.locale === 'en' ? '&lang=en' : ''}`,
    cancel_url: `${input.siteUrl}/comprar${input.draftKey ? `?d=${input.draftKey}` : ''}${input.locale === 'en' ? `${input.draftKey ? '&' : '?'}lang=en` : ''}`,
    // OXXO tarda hasta 3 días en confirmarse; el webhook async_payment_succeeded lo marca.
    payment_method_options: { oxxo: { expires_after_days: 3 } },
  });
  if (!session.url) throw new Error('Stripe no devolvió URL de pago.');
  return { url: session.url, id: session.id };
}
