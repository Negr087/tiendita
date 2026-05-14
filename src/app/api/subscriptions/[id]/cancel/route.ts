/**
 * POST /api/subscriptions/[id]/cancel
 *
 * Cancela una suscripción. Verifica que quien cancela sea el buyer
 * (matching de npub via sesión Nostr).
 *
 * Decisión: respetamos el ciclo actual ya pagado. El cliente conserva
 * el acceso hasta nextBillingAt, y a partir de ahí no se renueva.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();

  const sub = await db.subscription.findUnique({
    where: { id },
    include: { product: true },
  });
  if (!sub) {
    return NextResponse.json({ error: 'Suscripción no existe' }, { status: 404 });
  }

  // Autorización: o es el buyer (npub coincide), o es el comerciante dueño del producto
  const isBuyer = !!session.npub && session.npub === sub.buyerNpub;
  const isMerchant = !!session.userId && session.userId === sub.product.userId;
  if (!isBuyer && !isMerchant) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  if (sub.status !== 'ACTIVE' && sub.status !== 'PAST_DUE') {
    return NextResponse.json(
      { error: `No se puede cancelar: estado ${sub.status}` },
      { status: 409 },
    );
  }

  await db.subscription.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  });

  // Cancelar cualquier Order PENDING ligada a esta sub (no tiene sentido seguir esperando)
  await db.order.updateMany({
    where: { subscriptionId: id, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  });

  return NextResponse.json({ ok: true });
}
