/**
 * PATCH /api/products/[id] — actualiza un producto
 * DELETE /api/products/[id] — desactiva un producto (soft delete)
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';

const UpdateProductSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  priceArs: z.number().int().positive().max(10_000_000).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const product = await db.product.findUnique({ where: { id } });
  if (!product || product.userId !== session.userId) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  let body;
  try {
    body = UpdateProductSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: e instanceof z.ZodError ? e.errors : null },
      { status: 400 },
    );
  }

  const updated = await db.product.update({
    where: { id },
    data: {
      ...body,
      imageUrl: body.imageUrl === '' ? null : body.imageUrl,
    },
  });

  return NextResponse.json({ ok: true, product: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const product = await db.product.findUnique({ where: { id } });
  if (!product || product.userId !== session.userId) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  // Soft delete: marcamos inactive en vez de borrar (preserva orders históricas)
  await db.product.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ ok: true });
}
