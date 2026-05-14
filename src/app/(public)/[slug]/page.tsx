import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Zap, ShoppingBag, Repeat } from 'lucide-react';
import { db } from '@/lib/db';
import { formatArs, shortNpub } from '@/lib/utils';
import { BuyButton } from '@/components/BuyButton';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const user = await db.user.findUnique({ where: { slug } });
  if (!user) return { title: 'No encontrado · Tiendita' };
  return {
    title: `${user.shopName} · Tiendita`,
    description: user.shopDescription ?? `Comprá en ${user.shopName} con Bitcoin Lightning`,
  };
}

export default async function PublicShopPage({ params }: Props) {
  const { slug } = await params;
  const user = await db.user.findUnique({
    where: { slug },
    include: {
      products: {
        where: { active: true },
        orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
      },
    },
  });

  if (!user) notFound();
  if (user.lightningAddress.startsWith('temp_')) notFound();

  const oneShots = user.products.filter((p) => p.type === 'ONE_SHOT');
  const subscriptions = user.products.filter((p) => p.type === 'SUBSCRIPTION');

  // Color de acento personalizado por tienda
  const accent = user.shopAccent ?? '#FFD400';

  return (
    <main className="min-h-screen">
      {/* Header de la tienda */}
      <header
        className="border-b-2 border-ink py-12 md:py-16 px-6 relative overflow-hidden"
        style={{
          backgroundColor: accent + '22', // 22 = 13% opacity hex
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 80% 20%, ${accent}66, transparent 50%)`,
          }}
        />
        <div className="max-w-4xl mx-auto relative">
          <Link href="/" className="inline-flex items-center gap-2 mb-8 text-ink-soft hover:text-ink">
            <Zap className="w-4 h-4 fill-bolt stroke-ink" />
            <span className="font-mono text-sm">tiendita.app</span>
          </Link>

          <h1 className="font-display text-5xl md:text-6xl font-black leading-tight mb-3 text-balance">
            {user.shopName}
          </h1>
          {user.shopDescription && (
            <p className="text-lg md:text-xl text-ink-soft leading-relaxed max-w-2xl text-pretty">
              {user.shopDescription}
            </p>
          )}
          <div className="mt-8 flex items-center gap-3 text-receipt">
            <Zap className="w-3 h-3 fill-bolt stroke-ink" />
            <span>aceptamos lightning · pagás en sats</span>
            <span className="text-ink-mute">·</span>
            <span className="font-mono">{shortNpub(user.npub)}</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        {/* Suscripciones primero, son lo más distintivo */}
        {subscriptions.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Repeat className="w-5 h-5" />
              <h2 className="font-display text-3xl font-bold">Suscripciones</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {subscriptions.map((p) => (
                <ProductCard key={p.id} product={p} accent={accent} />
              ))}
            </div>
          </section>
        )}

        {oneShots.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <ShoppingBag className="w-5 h-5" />
              <h2 className="font-display text-3xl font-bold">Productos</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {oneShots.map((p) => (
                <ProductCard key={p.id} product={p} accent={accent} />
              ))}
            </div>
          </section>
        )}

        {user.products.length === 0 && (
          <div className="text-center py-16 text-ink-soft">
            <p>Esta tienda todavía no cargó productos.</p>
          </div>
        )}
      </div>

      {/* Footer minimal */}
      <footer className="border-t-2 border-ink bg-paper-warm py-6 px-6 mt-12">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-receipt">
          <span>powered by</span>
          <Link href="/">
            <img src="/tiendita-logo.png" alt="Tiendita" className="h-8" />
          </Link>
        </div>
      </footer>
    </main>
  );
}

function ProductCard({
  product,
  accent,
}: {
  product: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    priceArs: number;
    type: string;
    intervalDays: number | null;
  };
  accent: string;
}) {
  const isSub = product.type === 'SUBSCRIPTION';
  return (
    <article className="card-paper relative flex flex-col">
      {isSub && (
        <div className="absolute -top-3 -right-3 stamp bg-bolt border-ink">
          SUSCRIPCIÓN
        </div>
      )}
      {product.imageUrl ? (
        <div className="aspect-video bg-paper-dark border-2 border-ink mb-4 -mx-6 -mt-6 overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div
          className="aspect-video border-2 border-ink mb-4 -mx-6 -mt-6 flex items-center justify-center"
          style={{ backgroundColor: accent + '33' }}
        >
          {isSub ? <Repeat className="w-12 h-12" /> : <ShoppingBag className="w-12 h-12" />}
        </div>
      )}

      <h3 className="font-display text-2xl font-bold mb-2 leading-tight">
        {product.name}
      </h3>
      {product.description && (
        <p className="text-ink-soft mb-4 flex-1">{product.description}</p>
      )}

      <div className="perforated my-4" />

      <div className="flex items-baseline justify-between mb-4">
        <span className="text-receipt">precio</span>
        <span>
          <span className="font-display text-3xl font-black">
            {formatArs(product.priceArs)}
          </span>
          {isSub && product.intervalDays && (
            <span className="text-ink-mute"> / {product.intervalDays}d</span>
          )}
        </span>
      </div>

      <BuyButton productId={product.id} isSubscription={isSub} />
    </article>
  );
}
