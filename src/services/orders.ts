/**
 * Order processing — qué pasa cuando una orden pasa a PAID
 *
 * 1. Marcar Order como PAID (de forma atómica: solo un request puede "ganar")
 * 2. Offramp ARS:
 *    - Si la orden tiene wapuDepositId → Wapu manejó el pago directamente,
 *      consultamos el estado de la tentativa.
 *    - Si no → llamamos executeWapuWithdrawal (mock para demos, fallback real).
 */

import { db } from '@/lib/db';
import { executeWapuWithdrawal, getWapuTentativeStatus } from '@/services/wapu';

/**
 * Procesa una orden pagada. Es idempotente y segura ante concurrencia:
 * el checkout hace polling cada pocos segundos, así que varios requests pueden
 * detectar el pago al mismo tiempo. Solo el que logra pasar la orden de
 * PENDING a PAID dispara el offramp; el resto no hace nada.
 *
 * Devuelve true si este llamado fue el que procesó la orden.
 */
export async function processPaidOrder(orderId: string): Promise<boolean> {
  // 1. Claim atómico: UPDATE ... WHERE status = 'PENDING'
  const claimed = await db.order.updateMany({
    where: { id: orderId, status: 'PENDING' },
    data: { status: 'PAID', paidAt: new Date() },
  });
  if (claimed.count === 0) return false; // ya procesada (o no existe / no está pendiente)

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });
  if (!order) return false;

  // 2. Offramp ARS
  const wapuStatus = await runOfframp(order);
  await db.order.update({
    where: { id: orderId },
    data: wapuStatus,
  });

  return true;
}

async function runOfframp(order: {
  id: string;
  amountArs: number;
  wapuDepositId: string | null;
  user: { wapuAlias: string | null; wapuReceiverName: string | null };
}): Promise<{ wapuStatus: string; wapuTxId?: string }> {
  const { wapuAlias, wapuReceiverName } = order.user;
  if (!wapuAlias || !wapuReceiverName) {
    return { wapuStatus: 'NOT_CONFIGURED' };
  }

  if (order.wapuDepositId) {
    // Wapu direct-fiat: el cliente pagó el invoice de Wapu, Wapu maneja la transferencia ARS
    try {
      const tentative = await getWapuTentativeStatus(order.wapuDepositId);
      const status =
        tentative?.status === 'EXECUTED' ? 'SENT'
        : tentative?.status === 'FAILED' ? 'FAILED'
        : 'PENDING';
      return { wapuStatus: status };
    } catch (err) {
      console.error(`[orders] Wapu tentative status falló para ${order.id}:`, err);
      return { wapuStatus: 'PENDING' };
    }
  }

  // Mock/fallback: el cliente pagó la Lightning Address del comerciante directamente
  try {
    const result = await executeWapuWithdrawal({
      amountArs: order.amountArs,
      alias: wapuAlias,
      receiverName: wapuReceiverName,
      externalId: `tiendita_${order.id}`,
    });
    return { wapuStatus: result.status, wapuTxId: result.txId };
  } catch (err) {
    console.error(`[orders] Wapu falló para ${order.id}:`, err);
    return { wapuStatus: 'FAILED' };
  }
}
