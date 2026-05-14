/**
 * POST /api/auth/verify
 *
 * Recibe el evento firmado por el cliente, lo verifica criptográficamente,
 * y si es válido crea/actualiza el User y deja la sesión iniciada.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthEvent } from '@/lib/nostr-auth';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';

const BodySchema = z.object({
  signedEvent: z.object({
    id: z.string(),
    pubkey: z.string(),
    created_at: z.number(),
    kind: z.number(),
    tags: z.array(z.array(z.string())),
    content: z.string(),
    sig: z.string(),
  }),
});

export async function POST(req: Request) {
  const session = await getSession();

  if (!session.pendingChallenge) {
    return NextResponse.json({ error: 'No hay challenge pendiente' }, { status: 400 });
  }

  let body;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const result = verifyAuthEvent(
    body.signedEvent,
    session.pendingChallenge.challenge,
    session.pendingChallenge.issuedAt,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 401 });
  }

  // Buscar o crear el usuario por npub
  let user = await db.user.findUnique({ where: { npub: result.npub } });

  if (!user) {
    // Primer login: usuario aún no tiene tienda configurada
    // Lo dejamos en estado "incompleto" — el dashboard le va a pedir setup
    const tempSlug = `m-${result.pubkey.slice(0, 10)}`;
    const tempLnAddr = `temp_${result.pubkey.slice(0, 8)}@example.com`;

    user = await db.user.create({
      data: {
        npub: result.npub,
        slug: tempSlug,
        shopName: 'Mi tienda',
        lightningAddress: tempLnAddr,
      },
    });
  }

  // Sesión iniciada
  session.userId = user.id;
  session.npub = user.npub;
  session.pendingChallenge = undefined;
  await session.save();

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      npub: user.npub,
      slug: user.slug,
      shopName: user.shopName,
      // Si nunca configuró su tienda real, redirigimos a /setup
      needsSetup: user.lightningAddress.startsWith('temp_'),
    },
  });
}
