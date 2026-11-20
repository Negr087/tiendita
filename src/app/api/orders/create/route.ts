/**
 * POST /api/orders/create
 *
 * Endpoint público (no requiere auth del comprador).
 * Recibe productId + datos opcionales del comprador.
 *
 * Flujo:
 *   1. Si el comerciante tiene wapuAlias y WAPU_MODE=real:
 *      → Crea tentativa Wapu + obtiene invoice Lightning de Wapu.
 *        El cliente paga ese invoice; Wapu envía ARS al alias automáticamente.
 *   2. Fallback: genera invoice contra la Lightning Address del comerciante.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { arsToSats } from '@/services/price';
import { createInvoiceForAddress, extractPaymentHashFromBolt11 } from '@/services/lightning';
import { createWapuLightningInvoice } from '@/services/wapu';
import { rateLimit, clientIp } from '@/lib/rate-limit';

// Límites anti-abuso: cada orden genera un invoice real en la wallet del comercio
const ORDERS_PER_IP_PER_MINUTE = 10;
const PENDING_ORDERS_PER_SHOP = 30; // en los últimos 10 minutos

const CreateOrderSchema = z.object({
  productId: z.string(),
  buyerNpub: z.string().optional(),
  buyerEmail: z.string().email().optional(),
  buyerLabel: z.string().trim().min(1).max(80),
  buyerContact: z.string().trim().max(200).optional(),
});

export async function POST(req: Request) {
  if (!rateLimit(`order:${clientIp(req)}`, ORDERS_PER_IP_PER_MINUTE, 60_000)) {
    return NextResponse.json(
      { error: 'Demasiados pedidos seguidos. Esperá un minuto y probá de nuevo.' },
      { status: 429 },
    );
  }

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

  const recentPending = await db.order.count({
    where: {
      userId: product.userId,
      status: 'PENDING',
      createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
    },
  });
  if (recentPending >= PENDING_ORDERS_PER_SHOP) {
    return NextResponse.json(
      { error: 'Esta tienda está recibiendo muchos pedidos. Probá de nuevo en unos minutos.' },
      { status: 429 },
    );
  }

  const { sats, rate } = await arsToSats(product.priceArs);

  let bolt11: string | null = null;
  let paymentHash: string | null = null;
  let verifyUrl: string | null = null;
  let wapuTentativeId: string | null = null;
  let finalSats = sats;

  // Intento 1: Wapu direct-fiat (si el comerciante tiene alias y WAPU_MODE=real)
  if (product.user.wapuAlias && product.user.wapuReceiverName) {
    try {
      const wapuResult = await createWapuLightningInvoice({
        amountArs: product.priceArs,
        alias: product.user.wapuAlias,
        receiverName: product.user.wapuReceiverName,
      });
      if (wapuResult) {
        bolt11 = wapuResult.bolt11;
        paymentHash = extractPaymentHashFromBolt11(wapuResult.bolt11);
        verifyUrl = wapuResult.verifyUrl;
        wapuTentativeId = wapuResult.tentativeId;
        finalSats = wapuResult.amountSats ?? sats;
      }
    } catch (err) {
      console.warn('[orders] Wapu invoice falló, fallback a Lightning Address:', err);
    }
  }

  // Intento 2: Lightning Address del comerciante
  if (!bolt11) {
    try {
      const invoice = await createInvoiceForAddress({
        lightningAddress: product.user.lightningAddress,
        amountSats: sats,
        comment: `Tiendita: ${product.name.slice(0, 100)}`,
      });
      bolt11 = invoice.bolt11;
      paymentHash = invoice.paymentHash;
      verifyUrl = invoice.verifyUrl;
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
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  const order = await db.order.create({
    data: {
      productId: product.id,
      userId: product.userId,
      buyerNpub: body.buyerNpub,
      buyerEmail: body.buyerEmail,
      buyerLabel: body.buyerLabel,
      buyerContact: body.buyerContact || null,
      invoiceBolt11: bolt11!,
      paymentHash: paymentHash!,
      verifyUrl,
      wapuDepositId: wapuTentativeId,
      amountSats: finalSats,
      amountArs: product.priceArs,
      btcArsRate: rate,
      status: 'PENDING',
      expiresAt,
    },
  });

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    bolt11: bolt11!,
    amountSats: finalSats,
    amountArs: product.priceArs,
    expiresAt: expiresAt.toISOString(),
    productName: product.name,
  });
}
