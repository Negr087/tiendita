/**
 * Order processing — qué pasa cuando una orden pasa a PAID
 *
 * 1. Marcar Order como PAID
 * 2. Offramp ARS:
 *    - Si la orden tiene wapuDepositId → Wapu manejó el pago directamente,
 *      consultamos el estado de la tentativa.
 *    - Si no → llamamos executeWapuWithdrawal (mock para demos, fallback real).
 * 3. Si el producto es SUBSCRIPTION y es la primera orden, crear Subscription
 * 4. Si es la N-ésima orden de una subscription, actualizar nextBillingAt
 */

import { db } from '@/lib/db';
import { executeWapuWithdrawal, getWapuTentativeStatus } from '@/services/wapu';

export async function processPaidOrder(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { product: true, user: true },
  });
  if (!order) throw new Error(`Order ${orderId} no existe`);
  if (order.status === 'PAID') return; // idempotente

  // 1. Marcar pagada
  await db.order.update({
    where: { id: orderId },
    data: {
      status: 'PAID',
      paidAt: new Date(),
    },
  });

  // 2. Offramp ARS
  if (order.user.wapuAlias && order.user.wapuReceiverName) {
    if (order.wapuDepositId) {
      // Wapu direct-fiat: el cliente pagó el invoice de Wapu, Wapu maneja la transferencia ARS
      try {
        const tentative = await getWapuTentativeStatus(order.wapuDepositId);
        const wapuStatus =
          tentative?.status === 'EXECUTED' ? 'SENT'
          : tentative?.status === 'FAILED' ? 'FAILED'
          : 'PENDING';
        await db.order.update({
          where: { id: orderId },
          data: { wapuStatus },
        });
      } catch (err) {
        console.error(`[orders] Wapu tentative status falló para ${orderId}:`, err);
        await db.order.update({
          where: { id: orderId },
          data: { wapuStatus: 'PENDING' },
        });
      }
    } else {
      // Mock/fallback: el cliente pagó la Lightning Address del comerciante directamente
      try {
        const result = await executeWapuWithdrawal({
          amountArs: order.amountArs,
          alias: order.user.wapuAlias,
          receiverName: order.user.wapuReceiverName,
          externalId: `tiendita_${order.id}`,
        });
        await db.order.update({
          where: { id: orderId },
          data: {
            wapuTxId: result.txId,
            wapuStatus: result.status,
          },
        });
      } catch (err) {
        console.error(`[orders] Wapu falló para ${orderId}:`, err);
        await db.order.update({
          where: { id: orderId },
          data: { wapuStatus: 'FAILED' },
        });
      }
    }
  } else {
    await db.order.update({
      where: { id: orderId },
      data: { wapuStatus: 'NOT_CONFIGURED' },
    });
  }

  // 3. Si es subscription y primera orden, crear Subscription
  if (order.product.type === 'SUBSCRIPTION' && !order.subscriptionId) {
    const intervalDays = order.product.intervalDays ?? 30;
    const nextBilling = computeNextBilling(intervalDays);

    const subscription = await db.subscription.create({
      data: {
        productId: order.productId,
        buyerNpub: order.buyerNpub,
        buyerEmail: order.buyerEmail,
        buyerLabel: order.buyerLabel,
        intervalDays,
        nextBillingAt: nextBilling,
        cycleCount: 1,
        status: 'ACTIVE',
      },
    });

    await db.order.update({
      where: { id: orderId },
      data: { subscriptionId: subscription.id },
    });
  } else if (order.subscriptionId) {
    const sub = await db.subscription.findUnique({ where: { id: order.subscriptionId } });
    if (sub) {
      await db.subscription.update({
        where: { id: sub.id },
        data: {
          nextBillingAt: computeNextBilling(sub.intervalDays),
          cycleCount: sub.cycleCount + 1,
          status: 'ACTIVE',
        },
      });
    }
  }
}

/**
 * Calcula la próxima fecha de facturación.
 * En modo demo, los "días" se interpretan como múltiplos de DEMO_INTERVAL_MULTIPLIER_SECONDS.
 */
export function computeNextBilling(intervalDays: number): Date {
  const isDemoMode = process.env.DEMO_MODE === 'true';
  if (isDemoMode) {
    const multSec = parseInt(process.env.DEMO_INTERVAL_MULTIPLIER_SECONDS ?? '30', 10);
    return new Date(Date.now() + intervalDays * multSec * 1000);
  }
  return new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);
}
