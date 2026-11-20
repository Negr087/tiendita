'use client';

/**
 * Publica el catálogo de la tienda en relays Nostr, para que los productos
 * aparezcan en marketplaces Nostr sin depender del servidor de Tiendita.
 *
 * Se publican dos formatos:
 *   - NIP-15 (kind 30017 stall + 30018 product) → Plebeian Market y otros
 *   - NIP-99 (kind 30402 classified listing)     → Shopstr y otros
 * Los productos archivados se piden borrar con un evento NIP-09 (kind 5).
 *
 * Los eventos se firman en el navegador con la llave del comerciante
 * (nsec guardada al crear la cuenta o extensión NIP-07). El servidor
 * nunca ve la llave privada.
 */

import { useState } from 'react';
import { Loader2, Radio, Check } from 'lucide-react';
import { finalizeEvent, getPublicKey, type EventTemplate, type Event } from 'nostr-tools/pure';
import { SimplePool } from 'nostr-tools/pool';
import { nip19 } from 'nostr-tools';
import { PUBLIC_RELAYS } from '@/lib/nostr-relays';

interface Props {
  npub: string;
  shop: { id: string; name: string; description: string | null; url: string };
  products: Array<{
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    priceArs: number;
    active: boolean;
    createdAt: string;
  }>;
}

type Signer = (t: EventTemplate) => Promise<Event>;

async function getSigner(expectedPubkey: string): Promise<Signer> {
  // 1. Llave guardada en este navegador (cuentas creadas en Tiendita)
  const nsec = localStorage.getItem('tiendita_nsec');
  if (nsec) {
    try {
      const decoded = nip19.decode(nsec);
      if (decoded.type === 'nsec' && getPublicKey(decoded.data) === expectedPubkey) {
        const sk = decoded.data;
        return async (t) => finalizeEvent(t, sk);
      }
    } catch {
      // seguimos con la extensión
    }
  }

  // 2. Extensión NIP-07 (Alby, nos2x…)
  if (window.nostr) {
    const pk = await window.nostr.getPublicKey();
    if (pk !== expectedPubkey) {
      throw new Error('La extensión Nostr tiene otra cuenta activa. Cambiá a la cuenta de tu tienda.');
    }
    return (t) => window.nostr!.signEvent(t) as Promise<Event>;
  }

  throw new Error(
    'Para publicar necesitamos firmar con tu llave: usá la extensión Nostr (Alby, nos2x) ' +
      'o el navegador donde creaste tu cuenta.',
  );
}

export function NostrPublishButton({ npub, shop, products }: Props) {
  const [state, setState] = useState<'idle' | 'publishing' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  async function handlePublish() {
    setError(null);
    setSummary(null);
    setState('publishing');

    const decoded = nip19.decode(npub);
    if (decoded.type !== 'npub') {
      setError('npub inválido');
      setState('idle');
      return;
    }
    const pubkey = decoded.data;

    try {
      const sign = await getSigner(pubkey);
      const now = Math.floor(Date.now() / 1000);
      const active = products.filter((p) => p.active);
      const archived = products.filter((p) => !p.active);

      const templates: EventTemplate[] = [];

      // NIP-15 stall
      templates.push({
        kind: 30017,
        created_at: now,
        tags: [['d', shop.id]],
        content: JSON.stringify({
          id: shop.id,
          name: shop.name,
          description: `${shop.description ?? ''}\n\nComprá con Lightning: ${shop.url}`.trim(),
          currency: 'ARS',
          shipping: [{ id: 'coordinar', name: 'Coordinar con el vendedor', cost: 0, regions: ['Argentina'] }],
        }),
      });

      for (const p of active) {
        const images = p.imageUrl ? [p.imageUrl] : [];

        // NIP-15 product
        templates.push({
          kind: 30018,
          created_at: now,
          tags: [['d', p.id], ['t', 'tiendita']],
          content: JSON.stringify({
            id: p.id,
            stall_id: shop.id,
            name: p.name,
            description: p.description ?? '',
            images,
            currency: 'ARS',
            price: p.priceArs,
            quantity: null,
            specs: [],
            shipping: [{ id: 'coordinar', cost: 0 }],
          }),
        });

        // NIP-99 classified listing
        templates.push({
          kind: 30402,
          created_at: now,
          tags: [
            ['d', p.id],
            ['title', p.name],
            ['summary', (p.description ?? p.name).slice(0, 140)],
            ['published_at', String(Math.floor(new Date(p.createdAt).getTime() / 1000))],
            ['price', String(p.priceArs), 'ARS'],
            ['location', 'Argentina'],
            ['t', 'tiendita'],
            ['r', shop.url],
            ...images.map((url) => ['image', url]),
          ],
          content: `${p.description ?? ''}\n\n⚡ Comprá con Lightning en ${shop.url}`.trim(),
        });
      }

      // NIP-09: pedir borrar los productos archivados
      if (archived.length > 0) {
        templates.push({
          kind: 5,
          created_at: now,
          tags: archived.flatMap((p) => [
            ['a', `30018:${pubkey}:${p.id}`],
            ['a', `30402:${pubkey}:${p.id}`],
          ]),
          content: 'producto archivado',
        });
      }

      // Firmar en serie: algunas extensiones piden confirmar cada evento
      const events: Event[] = [];
      for (const t of templates) events.push(await sign(t));

      const pool = new SimplePool();
      let accepted = 0;
      try {
        const results = await Promise.all(
          events.map((ev) =>
            Promise.allSettled(pool.publish(PUBLIC_RELAYS, ev)).then((r) =>
              r.some((x) => x.status === 'fulfilled'),
            ),
          ),
        );
        accepted = results.filter(Boolean).length;
      } finally {
        pool.close(PUBLIC_RELAYS);
      }

      if (accepted === 0) throw new Error('Ningún relay aceptó los eventos. Probá de nuevo en un rato.');

      setSummary(
        `${active.length} producto${active.length === 1 ? '' : 's'} publicado${active.length === 1 ? '' : 's'} en Nostr` +
          (archived.length ? ` · ${archived.length} archivado${archived.length === 1 ? '' : 's'} retirado${archived.length === 1 ? '' : 's'}` : ''),
      );
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al publicar');
      setState('idle');
    }
  }

  return (
    <div className="card-paper-flat p-4 space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <p className="font-medium flex items-center gap-2">
            <Radio className="w-4 h-4" /> Publicar catálogo en Nostr
          </p>
          <p className="text-sm text-ink-soft">
            Tus productos aparecen en marketplaces Nostr como Shopstr y Plebeian Market.
            Volvé a publicar cada vez que cambies algo.
          </p>
        </div>
        <button
          onClick={handlePublish}
          disabled={state === 'publishing' || products.length === 0}
          className="btn-paper flex-shrink-0"
        >
          {state === 'publishing' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> publicando…
            </>
          ) : state === 'done' ? (
            <>
              <Check className="w-4 h-4 text-ok" /> publicar de nuevo
            </>
          ) : (
            'publicar'
          )}
        </button>
      </div>
      {summary && <p className="text-sm text-ok">✓ {summary}</p>}
      {error && <p className="text-sm text-err">⚠ {error}</p>}
    </div>
  );
}
