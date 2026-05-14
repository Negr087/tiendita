/**
 * GET /api/products — lista los productos del usuario logueado
 * POST /api/products — crea un producto nuevo
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';

const CreateProductSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  priceArs: z.number().int().positive().max(10_000_000),
  type: z.enum(['ONE_SHOT', 'SUBSCRIPTION']).default('ONE_SHOT'),
  intervalDays: z.number().int().min(1).max(365).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const products = await db.product.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let body;
  try {
    body = CreateProductSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: e instanceof z.ZodError ? e.errors : null },
      { status: 400 },
    );
  }

  if (body.type === 'SUBSCRIPTION' && !body.intervalDays) {
    return NextResponse.json(
      { error: 'Las suscripciones requieren intervalo en días' },
      { status: 400 },
    );
  }

  const product = await db.product.create({
    data: {
      userId: session.userId,
      name: body.name,
      description: body.description,
      imageUrl: body.imageUrl || null,
      priceArs: body.priceArs,
      type: body.type,
      intervalDays: body.type === 'SUBSCRIPTION' ? body.intervalDays : null,
    },
  });

  return NextResponse.json({ ok: true, product });
}
