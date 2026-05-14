/**
 * Subscription worker — Tiendita
 *
 * Corre como proceso aparte (npm run worker:subs).
 * Cada N segundos revisa qué Subscriptions ACTIVE tienen nextBillingAt <= now,
 * y para cada una:
 *   1. Genera un nuevo invoice contra la lightning address del comerciante.
 *   2. Crea una Order PENDING ligada a esa subscription.
 *   3. (Aquí iría la notificación al cliente: email/Nostr DM. Para hackathon
 *      lo dejamos simulado — el cliente debería tener una página /me/subscriptions
 *      donde ve los pendientes a pagar).
 *   4. Si el cliente no paga en X días, marca PAST_DUE.
 *
 * En modo demo (DEMO_MODE=true), corre cada 5 segundos. En producción, cada 60s.
 */

import { PrismaClient } from '@prisma/client';
import { createInvoiceForAddress } from '../services/lightning';
import { arsToSats } from '../services/price';

const db = new PrismaClient();

const TICK_INTERVAL_MS = process.env.DEMO_MODE === 'true' ? 5_000 : 60_000;
const PAST_DUE_GRACE_MS =
  process.env.DEMO_MODE === 'true'
    ? 60_000 // en demo: 1 minuto para pagar
    : 3 * 24 * 60 * 60 * 1000; // en prod: 3 días

let running = false;

async function tick() {
  if (running) return;
  running = true;

  try {
    const now = new Date();

    // 1. Renovaciones pendientes
    const due = await db.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingAt: { lte: now },
      },
      include: { product: { include: { user: true } } },
    });

    for (const sub of due) {
      // Si ya hay una Order PENDING reciente para este sub, no creamos otra
      const existingPending = await db.order.findFirst({
        where: {
          subscriptionId: sub.id,
          status: 'PENDING',
        },
      });
      if (existingPending) continue;

      console.log(
        `[worker] Renovando sub ${sub.id} (ciclo ${sub.cycleCount + 1}) para ${sub.product.name}`,
      );

      try {
        const { sats, rate } = await arsToSats(sub.product.priceArs);
        const invoice = await createInvoiceForAddress({
          lightningAddress: sub.product.user.lightningAddress,
          amountSats: sats,
          comment: `Tiendita: ${sub.product.name} · ciclo ${sub.cycleCount + 1}`,
        });

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await db.order.create({
          data: {
            productId: sub.productId,
            userId: sub.product.userId,
            buyerNpub: sub.buyerNpub,
            buyerEmail: sub.buyerEmail,
            buyerLabel: sub.buyerLabel,
            invoiceBolt11: invoice.bolt11,
            paymentHash: invoice.paymentHash,
            verifyUrl: invoice.verifyUrl,
            amountSats: sats,
            amountArs: sub.product.priceArs,
            btcArsRate: rate,
            status: 'PENDING',
            expiresAt,
            subscriptionId: sub.id,
            cycleNumber: sub.cycleCount + 1,
          },
        });
      } catch (err) {
        console.error(`[worker] Error renovando sub ${sub.id}:`, err);
      }
    }

    // 2. Marcar PAST_DUE las suscripciones cuyo último invoice está sin pagar pasada la gracia
    const stale = await db.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingAt: { lte: new Date(Date.now() - PAST_DUE_GRACE_MS) },
      },
    });
    for (const s of stale) {
      const lastOrder = await db.order.findFirst({
        where: { subscriptionId: s.id },
        orderBy: { createdAt: 'desc' },
      });
      if (lastOrder && lastOrder.status === 'PENDING') {
        await db.subscription.update({
          where: { id: s.id },
          data: { status: 'PAST_DUE' },
        });
        console.log(`[worker] Sub ${s.id} marcada PAST_DUE`);
      }
    }
  } catch (err) {
    console.error('[worker] tick falló:', err);
  } finally {
    running = false;
  }
}

console.log(
  `[worker] Iniciando worker de suscripciones · tick cada ${TICK_INTERVAL_MS / 1000}s`,
);

// Tick inicial
tick();
setInterval(tick, TICK_INTERVAL_MS);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[worker] cerrando…');
  await db.$disconnect();
  process.exit(0);
});
