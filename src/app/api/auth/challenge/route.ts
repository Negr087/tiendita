/**
 * POST /api/auth/challenge
 *
 * El cliente pide un challenge. Lo guardamos en la sesión y se lo devolvemos.
 * El cliente lo firma con NIP-07 (window.nostr) y manda el evento firmado a /verify.
 */

import { NextResponse } from 'next/server';
import { createChallenge } from '@/lib/nostr-auth';
import { getSession } from '@/lib/session';

export async function POST() {
  const session = await getSession();
  const { challenge, issuedAt } = createChallenge();

  session.pendingChallenge = { challenge, issuedAt };
  await session.save();

  return NextResponse.json({
    challenge,
    issuedAt,
    // Instrucciones para el cliente sobre qué firmar
    eventTemplate: {
      kind: 27235,
      content: challenge,
      tags: [
        ['challenge', challenge],
        ['u', '/api/auth/verify'],
      ],
      created_at: Math.floor(Date.now() / 1000),
    },
  });
}
