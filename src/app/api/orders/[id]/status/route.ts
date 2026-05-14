/**
 * GET /api/orders/[id]/status
 *
 * Endpoint público que el frontend hace polling cada 2s para saber si el pago llegó.
 * Internamente: si la wallet del comerciante soporta LUD-21 verify, lo consulta.
 * Si no, devuelve el status actual de la DB.
 *
 * También dispara el offramp Wapu cuando detecta el pago por primera vez.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyInvoicePayment } from '@/services/lightning';
import { processPaidOrder } from '@/services/orders';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { product: true },
  });
  if (!order) {
    return NextResponse.json({ error: 'Orden no existe' }, { status: 404 });
  }

  // Si ya está pagada, devolvemos el estado
  if (order.status === 'PAID') {
    return NextResponse.json({
      status: 'PAID',
      paidAt: order.paidAt?.toISOString(),
      wapuStatus: order.wapuStatus,
      productType: order.product.type,
      intervalDays: order.product.intervalDays,
    });
  }

  // Si expiró
  if (new Date() > order.expiresAt) {
    if (order.status !== 'EXPIRED') {
      await db.order.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
    }
    return NextResponse.json({ status: 'EXPIRED' });
  }

  // Está pendiente: chequeamos si pagó vía LUD-21 (si la wallet soporta verify URL)
  if (order.verifyUrl) {
    const verification = await verifyInvoicePayment(order.verifyUrl);
    if (verification?.settled) {
      await processPaidOrder(id);
      const updated = await db.order.findUnique({ where: { id }, include: { product: true } });
      return NextResponse.json({
        status: 'PAID',
        paidAt: updated?.paidAt?.toISOString(),
        wapuStatus: updated?.wapuStatus,
        productType: updated?.product.type,
        intervalDays: updated?.product.intervalDays,
      });
    }
  }

  return NextResponse.json({
    status: 'PENDING',
    expiresAt: order.expiresAt.toISOString(),
  });
}

/**
 * POST /api/orders/[id]/status
 *
 * Endpoint para forzar la confirmación manual (modo dev/demo).
 * En producción real, sería un webhook de la wallet.
 *
 * Para hackathon: este endpoint permite simular el pago en la demo en vivo
 * sin tener que pagar BTC real. Esto se desactiva con DEMO_MODE=false.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Confirmación manual deshabilitada. Configurá DEMO_MODE=true.' },
      { status: 403 },
    );
  }

  const order = await db.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: 'No existe' }, { status: 404 });

  if (order.status !== 'PENDING') {
    return NextResponse.json({ error: `Orden está en estado ${order.status}` }, { status: 409 });
  }

  await processPaidOrder(id);

  const updated = await db.order.findUnique({ where: { id } });
  return NextResponse.json({
    ok: true,
    status: updated?.status,
    wapuStatus: updated?.wapuStatus,
  });
}
