/**
 * POST /api/orders/create
 *
 * Endpoint público (no requiere auth del comprador).
 * Recibe productId + datos opcionales del comprador.
 * Genera el invoice Lightning contra la lightning address del comerciante.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { arsToSats } from '@/services/price';
import { createInvoiceForAddress } from '@/services/lightning';

const CreateOrderSchema = z.object({
  productId: z.string(),
  buyerNpub: z.string().optional(),
  buyerEmail: z.string().email().optional(),
  buyerLabel: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  let body;
  try {
    body = CreateOrderSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: e instanceof z.ZodError ? e.errors : null },
      { status: 400 },
    );
  }

  const product = await db.product.findUnique({
    where: { id: body.productId },
    include: { user: true },
  });
  if (!product || !product.active) {
    return NextResponse.json({ error: 'Producto no disponible' }, { status: 404 });
  }

  // Convertir ARS → sats con tasa actual
  const { sats, rate } = await arsToSats(product.priceArs);

  // Generar invoice contra la lightning address del comerciante
  let invoice;
  try {
    invoice = await createInvoiceForAddress({
      lightningAddress: product.user.lightningAddress,
      amountSats: sats,
      comment: `Tiendita: ${product.name.slice(0, 100)}`,
    });
  } catch (err) {
    console.error('[orders] Falló crear invoice:', err);
    return NextResponse.json(
      {
        error: 'No pudimos generar el invoice. Probá de nuevo en unos segundos.',
        detail: err instanceof Error ? err.message : 'unknown',
      },
      { status: 502 },
    );
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  // Crear la orden en estado PENDING
  const order = await db.order.create({
    data: {
      productId: product.id,
      userId: product.userId,
      buyerNpub: body.buyerNpub,
      buyerEmail: body.buyerEmail,
      buyerLabel: body.buyerLabel,
      invoiceBolt11: invoice.bolt11,
      paymentHash: invoice.paymentHash,
      amountSats: sats,
      amountArs: product.priceArs,
      btcArsRate: rate,
      status: 'PENDING',
      expiresAt,
      cycleNumber: product.type === 'SUBSCRIPTION' ? 1 : null,
    },
  });

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    bolt11: invoice.bolt11,
    amountSats: sats,
    amountArs: product.priceArs,
    expiresAt: expiresAt.toISOString(),
    productName: product.name,
    productType: product.type,
    intervalDays: product.intervalDays,
  });
}
