/**
 * GET /api/me/subscriptions
 *
 * Devuelve las suscripciones del usuario logueado VISTAS COMO COMPRADOR
 * (es decir, donde su npub aparece como buyerNpub).
 *
 * Esto permite que un comprador entre con su Nostr y vea/cancele las subs
 * que tiene activas en distintas tiendas.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session.npub) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const subscriptions = await db.subscription.findMany({
    where: { buyerNpub: session.npub },
    include: {
      product: {
        select: {
          name: true,
          priceArs: true,
          intervalDays: true,
          user: { select: { shopName: true, slug: true } },
        },
      },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ subscriptions });
}
