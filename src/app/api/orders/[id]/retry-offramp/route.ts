/**
 * POST /api/orders/[id]/retry-offramp
 *
 * El comerciante reintenta el envío de pesos (Wapu) de una venta pagada
 * cuyo offramp falló o quedó pendiente.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { retryOfframp } from '@/services/orders';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const order = await db.order.findUnique({ where: { id }, select: { userId: true } });
  if (!order || order.userId !== session.userId) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  const result = await retryOfframp(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }
  return NextResponse.json({ ok: true, wapuStatus: result.wapuStatus });
}
