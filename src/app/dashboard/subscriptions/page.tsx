import { redirect } from 'next/navigation';
import { Repeat } from 'lucide-react';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { formatArs, timeAgo, shortNpub } from '@/lib/utils';
import { CancelSubButton } from '@/components/CancelSubButton';

export default async function SubscriptionsPage() {
  const session = await getSession();
  if (!session.userId) redirect('/login');

  const subscriptions = await db.subscription.findMany({
    where: { product: { userId: session.userId } },
    include: { product: { select: { name: true, priceArs: true, intervalDays: true } } },
    orderBy: [{ status: 'asc' }, { nextBillingAt: 'asc' }],
  });

  const active = subscriptions.filter((s) => s.status === 'ACTIVE');
  const others = subscriptions.filter((s) => s.status !== 'ACTIVE');

  return (
    <div className="space-y-8">
      <div>
        <p className="text-receipt mb-1">suscripciones</p>
        <h1 className="font-display text-4xl md:text-5xl font-black leading-tight">
          Recurrentes
        </h1>
        <p className="text-ink-soft mt-2 max-w-xl">
          Cada suscripción activa se renueva automáticamente al fin de su ciclo.
          Tu cliente recibe un nuevo invoice; cuando paga, vos recibís pesos.
        </p>
      </div>

      {/* Activas */}
      <section>
        <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-ok animate-pulse" />
          Activas ({active.length})
        </h2>
        {active.length === 0 ? (
          <div className="card-paper-flat text-center py-12 text-ink-soft">
            No hay suscripciones activas todavía.
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((s) => (
              <SubCard key={s.id} sub={s} />
            ))}
          </div>
        )}
      </section>

      {/* Otras */}
      {others.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold mb-4 text-ink-soft">
            Histórico ({others.length})
          </h2>
          <div className="space-y-3">
            {others.map((s) => (
              <SubCard key={s.id} sub={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SubCard({
  sub,
}: {
  sub: {
    id: string;
    status: string;
    cycleCount: number;
    intervalDays: number;
    nextBillingAt: Date;
    createdAt: Date;
    cancelledAt: Date | null;
    buyerNpub: string | null;
    buyerLabel: string | null;
    product: { name: string; priceArs: number; intervalDays: number | null };
  };
}) {
  const isActive = sub.status === 'ACTIVE';
  const ms = sub.nextBillingAt.getTime() - Date.now();
  const renewsIn =
    ms <= 0
      ? 'ahora mismo'
      : ms < 60_000
        ? 'en menos de 1 min'
        : ms < 3_600_000
          ? `en ${Math.round(ms / 60_000)} min`
          : ms < 86_400_000
            ? `en ${Math.round(ms / 3_600_000)} h`
            : `en ${Math.round(ms / 86_400_000)} días`;

  return (
    <div className="card-paper-flat p-4 flex items-center gap-4">
      <Repeat className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : 'text-ink-mute'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium">{sub.product.name}</p>
          <span className="text-receipt bg-paper-dark px-2 py-0.5">
            ciclo {sub.cycleCount}
          </span>
          <StatusPill status={sub.status} />
        </div>
        <p className="text-receipt mt-0.5">
          {sub.buyerNpub
            ? shortNpub(sub.buyerNpub)
            : sub.buyerLabel ?? 'anónimo'}
          {' · '}
          activa desde {timeAgo(sub.createdAt)}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-display font-bold">{formatArs(sub.product.priceArs)}</p>
        <p className="text-receipt">
          {isActive ? `renueva ${renewsIn}` : 'cancelada'}
        </p>
      </div>
      {isActive && <CancelSubButton subId={sub.id} />}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: 'activa', cls: 'border-ok text-ok' },
    PAST_DUE: { label: 'cobro fallido', cls: 'border-warn text-warn' },
    CANCELLED: { label: 'cancelada', cls: 'border-ink-mute text-ink-mute' },
    ENDED: { label: 'finalizada', cls: 'border-ink-mute text-ink-mute' },
  };
  const meta = map[status] ?? map.ACTIVE;
  return <span className={`text-xs px-2 py-0.5 border ${meta.cls}`}>{meta.label}</span>;
}
