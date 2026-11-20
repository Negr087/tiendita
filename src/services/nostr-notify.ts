/**
 * Notificaciones por Nostr — avisa al comerciante cada venta con un DM.
 *
 * Tiendita tiene su propia identidad Nostr (TIENDITA_NSEC) y le manda un
 * mensaje encriptado (NIP-04, el más soportado por clientes como Damus,
 * Primal o Amethyst) al npub con el que el comerciante se loguea.
 *
 * Si TIENDITA_NSEC no está configurado, no hace nada.
 * Nunca tira error: una notificación fallida no puede romper una venta.
 */

import { finalizeEvent } from 'nostr-tools/pure';
import { SimplePool } from 'nostr-tools/pool';
import * as nip04 from 'nostr-tools/nip04';
import { nip19 } from 'nostr-tools';
import { db } from '@/lib/db';
import { PUBLIC_RELAYS } from '@/lib/nostr-relays';
import { formatArs, formatSats } from '@/lib/utils';

const PUBLISH_TIMEOUT_MS = 6_000;

function getBotSecretKey(): Uint8Array | null {
  const nsec = process.env.TIENDITA_NSEC;
  if (!nsec) return null;
  try {
    const decoded = nip19.decode(nsec);
    return decoded.type === 'nsec' ? decoded.data : null;
  } catch {
    console.error('[nostr-notify] TIENDITA_NSEC inválido');
    return null;
  }
}

export function buildSaleMessage(o: {
  productName: string;
  amountArs: number;
  amountSats: number;
  buyerLabel: string | null;
  buyerContact: string | null;
  wapuStatus: string | null;
  appUrl: string;
}): string {
  const lines = [
    '⚡ ¡Nueva venta en tu Tiendita!',
    '',
    `🛍️ ${o.productName}`,
    `💰 ${formatArs(o.amountArs)} (${formatSats(o.amountSats)})`,
  ];
  if (o.buyerLabel) lines.push(`👤 ${o.buyerLabel}`);
  if (o.buyerContact) lines.push(`📇 ${o.buyerContact}`);
  if (o.wapuStatus === 'SENT') lines.push('🏦 Pesos enviados a tu alias');
  if (o.wapuStatus === 'FAILED') lines.push('⚠️ El envío de pesos falló: podés reintentarlo desde tu panel');
  lines.push('', `Ver ventas: ${o.appUrl}/dashboard/orders`);
  return lines.join('\n');
}

export async function notifyMerchantSale(orderId: string): Promise<void> {
  const sk = getBotSecretKey();
  if (!sk) return;

  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { product: { select: { name: true } }, user: { select: { npub: true } } },
    });
    if (!order || order.status !== 'PAID') return;

    const decoded = nip19.decode(order.user.npub);
    if (decoded.type !== 'npub') return;
    const merchantPubkey = decoded.data;

    const text = buildSaleMessage({
      productName: order.product.name,
      amountArs: order.amountArs,
      amountSats: order.amountSats,
      buyerLabel: order.buyerLabel,
      buyerContact: order.buyerContact,
      wapuStatus: order.wapuStatus,
      appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, ''),
    });

    const event = finalizeEvent(
      {
        kind: 4,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', merchantPubkey]],
        content: nip04.encrypt(sk, merchantPubkey, text),
      },
      sk,
    );

    const pool = new SimplePool();
    try {
      const publishes = pool.publish(PUBLIC_RELAYS, event);
      const timeout = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error('timeout')), PUBLISH_TIMEOUT_MS),
      );
      // Alcanza con que un relay lo acepte
      await Promise.race([Promise.any(publishes), timeout]);
    } finally {
      pool.close(PUBLIC_RELAYS);
    }
  } catch (err) {
    console.error(`[nostr-notify] no se pudo notificar la venta ${orderId}:`, err);
  }
}
