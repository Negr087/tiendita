import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Zap, Repeat, ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { formatArs, timeAgo } from '@/lib/utils';
import { CancelMySubButton } from '@/components/CancelMySubButton';

export default async function MySubscriptionsPage() {
  const session = await getSession();
  if (!session.npub) redirect('/login');

  const subscriptions = await db.subscription.findMany({
    where: { buyerNpub: session.npub },
    include: {
      product: {
        select: {
          name: true,
          priceArs: true,
          intervalDays: true,
          user: { select: { shopName: true, slug: true } },
        },
      },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

  return (
    <main className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
      <Link href="/" className="btn-ghost mb-8 inline-flex">
        <ArrowLeft className="w-4 h-4" /> volver
      </Link>

      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-5 h-5 fill-bolt stroke-ink" />
        <span className="font-mono text-receipt">tus suscripciones</span>
      </div>

      <h1 className="font-display text-4xl md:text-5xl font-black leading-tight mb-2">
        Mis suscripciones
      </h1>
      <p className="text-ink-soft mb-10">
        Acá ves todas las suscripciones activas que tenés en tiendas Tiendita.
        Podés cancelar cualquiera en cualquier momento.
      </p>

      {subscriptions.length === 0 ? (
        <div className="card-paper-flat text-center py-16 text-ink-soft">
          Todavía no tenés suscripciones activas.
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((s) => {
            const isActive = s.status === 'ACTIVE';
            const ms = s.nextBillingAt.getTime() - Date.now();
            const renewsIn =
              ms <= 0
                ? 'pronto'
                : ms < 60_000
                  ? '< 1 min'
                  : ms < 3_600_000
                    ? `${Math.round(ms / 60_000)} min`
                    : ms < 86_400_000
                      ? `${Math.round(ms / 3_600_000)} h`
                      : `${Math.round(ms / 86_400_000)} días`;

            return (
              <div key={s.id} className="card-paper-flat p-4 flex items-center gap-4">
                <Repeat className={`w-5 h-5 ${isActive ? '' : 'text-ink-mute'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{s.product.name}</p>
                    <Link
                      href={`/${s.product.user.slug}`}
                      className="text-receipt underline-offset-4 hover:underline"
                    >
                      en {s.product.user.shopName}
                    </Link>
                  </div>
                  <p className="text-receipt mt-0.5">
                    ciclo {s.cycleCount} · activa hace {timeAgo(s.createdAt)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-display font-bold">
                    {formatArs(s.product.priceArs)}
                  </p>
                  <p className="text-receipt">
                    {isActive ? `renueva en ${renewsIn}` : s.status.toLowerCase()}
                  </p>
                </div>
                {isActive && <CancelMySubButton subId={s.id} />}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
