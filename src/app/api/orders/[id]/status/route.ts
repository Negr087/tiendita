/**
 * GET /api/orders/[id]/status
 *
 * Endpoint público que el frontend hace polling cada 2s para saber si el pago llegó.
 * Internamente: si la wallet del comerciante soporta LUD-21 verify, lo consulta.
 * Si no, devuelve el status actual de la DB.
 *
 * También dispara el offramp Wapu cuando detecta el pago por primera vez.
 */

import { NextResponse, after } from 'next/server';
import { db } from '@/lib/db';
import { verifyInvoicePayment } from '@/services/lightning';
import { processPaidOrder } from '@/services/orders';
import { notifyMerchantSale } from '@/services/nostr-notify';

async function paidResponse(id: string) {
  const order = await db.order.findUnique({
    where: { id },
    include: { product: { select: { deliveryInfo: true } } },
  });
  return NextResponse.json({
    status: 'PAID',
    paidAt: order?.paidAt?.toISOString(),
    wapuStatus: order?.wapuStatus ?? null,
    // Solo se revela una vez pagada la orden
    deliveryInfo: order?.product.deliveryInfo ?? null,
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const order = await db.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: 'Orden no existe' }, { status: 404 });
  }

  if (order.status === 'PAID') return paidResponse(id);

  if (order.status === 'CANCELLED') {
    return NextResponse.json({ status: 'CANCELLED' });
  }

  // Está pendiente: chequeamos si pagó vía LUD-21 si tenemos verifyUrl.
  // Lo hacemos ANTES de chequear expiración: un pago que llegó justo al límite
  // de los 15 minutos tiene que contar como pagado.
  if (order.verifyUrl) {
    const verification = await verifyInvoicePayment(order.verifyUrl);
    if (verification?.settled) {
      if (await processPaidOrder(id)) {
        // El DM al comerciante se manda después de responder, sin demorar el checkout
        after(() => notifyMerchantSale(id));
      }
      return paidResponse(id);
    }
  }

  if (new Date() > order.expiresAt) {
    await db.order.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });
    return NextResponse.json({ status: 'EXPIRED' });
  }

  return NextResponse.json({
    status: 'PENDING',
    expiresAt: order.expiresAt.toISOString(),
    // false = la wallet del comerciante no soporta LUD-21 y no podemos
    // detectar el pago automáticamente
    canAutoDetect: !!order.verifyUrl,
  });
}

/**
 * POST /api/orders/[id]/status
 *
 * Confirmación manual del pago, solo para demos (DEMO_MODE=true).
 * Permite mostrar el flujo completo sin pagar BTC real.
 *
 * Nunca se habilita con WAPU_MODE=real: este endpoint no requiere auth,
 * así que cualquiera podría marcar órdenes como pagadas y disparar
 * retiros de pesos reales.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (process.env.DEMO_MODE !== 'true' || process.env.WAPU_MODE === 'real') {
    return NextResponse.json(
      { error: 'Confirmación manual deshabilitada.' },
      { status: 403 },
    );
  }

  const order = await db.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: 'No existe' }, { status: 404 });

  const processed = await processPaidOrder(id);
  if (!processed) {
    return NextResponse.json({ error: `Orden está en estado ${order.status}` }, { status: 409 });
  }
  after(() => notifyMerchantSale(id));

  return paidResponse(id);
}
