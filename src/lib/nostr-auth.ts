/**
 * Nostr auth — Mostrador
 *
 * Estrategia: Login por NIP-07 (extensión del navegador como Alby/nos2x).
 * El cliente firma un evento "challenge" con su clave privada.
 * El servidor verifica la firma con la clave pública.
 *
 * Por qué NIP-07:
 * - Cero passwords, cero email/SMS, cero captcha.
 * - El usuario reusa la identidad Nostr que ya tiene.
 * - Imposible de falsificar sin la nsec del usuario.
 * - Soberanía pura: si La Crypta cierra, la identidad sigue siendo del usuario.
 */

import { verifyEvent, type Event as NostrEvent } from 'nostr-tools/pure';
import { nip19 } from 'nostr-tools';

export const AUTH_EVENT_KIND = 27235; // NIP-98 HTTP Auth (lo reusamos)
export const CHALLENGE_VALIDITY_MS = 5 * 60 * 1000; // 5 minutos

export interface AuthChallenge {
  challenge: string;
  issuedAt: number;
}

/** Genera un challenge nuevo para que el cliente lo firme. */
export function createChallenge(): AuthChallenge {
  // Crypto-random: 16 bytes en hex = 32 chars
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const challenge = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

  return {
    challenge,
    issuedAt: Date.now(),
  };
}

/**
 * Verifica un evento Nostr firmado contra el challenge esperado.
 * Devuelve el npub si todo OK, null si no.
 */
export function verifyAuthEvent(
  event: NostrEvent,
  expectedChallenge: string,
  challengeIssuedAt: number,
): { ok: true; npub: string; pubkey: string } | { ok: false; reason: string } {
  // 1. Estructura básica
  if (!event || typeof event !== 'object') {
    return { ok: false, reason: 'Evento inválido' };
  }

  // 2. Kind correcto (NIP-98)
  if (event.kind !== AUTH_EVENT_KIND) {
    return { ok: false, reason: 'Kind incorrecto' };
  }

  // 3. Challenge dentro del contenido o tag
  const challengeTag = event.tags.find((t) => t[0] === 'challenge');
  const challengeInEvent = challengeTag?.[1] ?? event.content;
  if (challengeInEvent !== expectedChallenge) {
    return { ok: false, reason: 'Challenge no coincide' };
  }

  // 4. No expirado
  if (Date.now() - challengeIssuedAt > CHALLENGE_VALIDITY_MS) {
    return { ok: false, reason: 'Challenge expirado' };
  }

  // 5. Timestamp del evento razonable (no del futuro lejano, no muy viejo)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - event.created_at) > 600) {
    return { ok: false, reason: 'Timestamp del evento fuera de rango' };
  }

  // 6. Firma criptográfica válida — esto es lo que asegura la identidad
  if (!verifyEvent(event)) {
    return { ok: false, reason: 'Firma inválida' };
  }

  // 7. Convertir pubkey hex a npub bech32
  try {
    const npub = nip19.npubEncode(event.pubkey);
    return { ok: true, npub, pubkey: event.pubkey };
  } catch {
    return { ok: false, reason: 'Pubkey inválida' };
  }
}

/** Convierte npub a hex pubkey. Throws si es inválido. */
export function npubToHex(npub: string): string {
  const decoded = nip19.decode(npub);
  if (decoded.type !== 'npub') {
    throw new Error('No es un npub válido');
  }
  return decoded.data;
}
