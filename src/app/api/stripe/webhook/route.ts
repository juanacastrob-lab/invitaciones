import { NextResponse } from 'next/server';
import { settleOrder } from '@/actions/order';
import { stripe, stripeConfig } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * Webhook de Stripe. Con el pago confirmado (tarjeta al momento; OXXO/SPEI
 * cuando el banco avisa) el pedido queda pagado y todo lo demás arranca.
 * Se valida la firma con STRIPE_WEBHOOK_SECRET; sin ella no se acepta nada.
 */
export async function POST(req: Request) {
  const cfg = stripeConfig();
  if (!cfg?.webhookSecret) return NextResponse.json({ error: 'webhook no configurado' }, { status: 503 });
  const sig = req.headers.get('stripe-signature');
  const raw = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig ?? '', cfg.webhookSecret);
  } catch (e) {
    return NextResponse.json({ error: `firma inválida: ${(e as Error).message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;
    const orderId = session.metadata?.order_id ?? session.client_reference_id;
    if (orderId && session.payment_status === 'paid') {
      const ref = typeof session.payment_intent === 'string' ? session.payment_intent : session.id;
      const r = await settleOrder(orderId, ref, 'stripe');
      if (!r.ok) console.error('[stripe] pedido no encontrado', orderId);
    }
  } else if (event.type === 'checkout.session.async_payment_failed') {
    console.warn('[stripe] pago diferido falló', event.data.object.metadata?.order_id);
  }
  return NextResponse.json({ received: true });
}
