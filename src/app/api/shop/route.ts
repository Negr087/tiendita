/**
 * PUT /api/shop — actualiza la info de la tienda del usuario logueado
 * GET /api/shop — devuelve la tienda del usuario logueado
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { slugify } from '@/lib/utils';

const UpdateShopSchema = z.object({
  shopName: z.string().min(2).max(60),
  shopDescription: z.string().max(280).optional(),
  slug: z.string().min(2).max(40).optional(),
  shopAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  lightningAddress: z
    .string()
    .regex(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Lightning address inválida'),
  wapuAlias: z.string().min(3).max(40).optional(),
  wapuReceiverName: z.string().min(2).max(80).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { _count: { select: { products: true, orders: true } } },
  });
  if (!user) return NextResponse.json({ error: 'Usuario no existe' }, { status: 404 });

  return NextResponse.json({
    id: user.id,
    npub: user.npub,
    slug: user.slug,
    shopName: user.shopName,
    shopDescription: user.shopDescription,
    shopAccent: user.shopAccent,
    lightningAddress: user.lightningAddress,
    wapuAlias: user.wapuAlias,
    wapuReceiverName: user.wapuReceiverName,
    productsCount: user._count.products,
    ordersCount: user._count.orders,
    needsSetup: user.lightningAddress.startsWith('temp_'),
  });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let body;
  try {
    body = UpdateShopSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: e instanceof z.ZodError ? e.errors : null },
      { status: 400 },
    );
  }

  // Si pidió cambiar slug, validar que esté libre
  let slug = body.slug ? slugify(body.slug) : undefined;
  if (slug) {
    const existing = await db.user.findUnique({ where: { slug } });
    if (existing && existing.id !== session.userId) {
      return NextResponse.json({ error: 'Ese slug ya está tomado' }, { status: 409 });
    }
  }

  const updated = await db.user.update({
    where: { id: session.userId },
    data: {
      shopName: body.shopName,
      shopDescription: body.shopDescription,
      shopAccent: body.shopAccent,
      lightningAddress: body.lightningAddress,
      wapuAlias: body.wapuAlias,
      wapuReceiverName: body.wapuReceiverName,
      ...(slug ? { slug } : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    slug: updated.slug,
    shopName: updated.shopName,
  });
}
