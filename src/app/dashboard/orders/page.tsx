import { redirect } from 'next/navigation';
import { Zap, Repeat, Clock, X } from 'lucide-react';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { formatArs, formatSats, timeAgo, shortNpub } from '@/lib/utils';

export default async function OrdersPage() {
  const session = await getSession();
  if (!session.userId) redirect('/login');

  const orders = await db.order.findMany({
    where: { userId: session.userId },
    include: { product: { select: { name: true, type: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-receipt mb-1">ventas</p>
        <h1 className="font-display text-4xl md:text-5xl font-black leading-tight">
          Historial
        </h1>
      </div>

      {orders.length === 0 ? (
        <div className="card-paper-flat text-center py-16 text-ink-soft">
          Todavía no tuviste ventas. Compartí la URL de tu tienda para empezar.
        </div>
      ) : (
        <div className="card-paper p-0 overflow-hidden">
          {orders.map((o, i) => (
            <div
              key={o.id}
              className={`flex items-center gap-4 p-4 ${
                i > 0 ? 'border-t border-ink/10' : ''
              }`}
            >
              <StatusIcon status={o.status} type={o.product.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{o.product.name}</p>
                  {o.product.type === 'SUBSCRIPTION' && o.cycleNumber && (
                    <span className="text-receipt bg-paper-dark px-2 py-0.5">
                      ciclo {o.cycleNumber}
                    </span>
                  )}
                </div>
                <p className="text-receipt">
                  {o.buyerNpub
                    ? shortNpub(o.buyerNpub)
                    : o.buyerLabel ?? 'cliente anónimo'}
                  {' · '}
                  {timeAgo(o.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display font-bold">{formatArs(o.amountArs)}</p>
                <p className="text-receipt">{formatSats(o.amountSats)}</p>
              </div>
              <StatusBadge status={o.status} wapuStatus={o.wapuStatus} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status, type }: { status: string; type: string }) {
  if (status === 'PAID') {
    return type === 'SUBSCRIPTION' ? (
      <Repeat className="w-5 h-5 text-ok flex-shrink-0" />
    ) : (
      <Zap className="w-5 h-5 fill-bolt stroke-ink flex-shrink-0" />
    );
  }
  if (status === 'EXPIRED' || status === 'CANCELLED') {
    return <X className="w-5 h-5 text-ink-mute flex-shrink-0" />;
  }
  return <Clock className="w-5 h-5 text-warn flex-shrink-0 animate-pulse" />;
}

function StatusBadge({
  status,
  wapuStatus,
}: {
  status: string;
  wapuStatus: string | null;
}) {
  const labels: Record<string, { label: string; cls: string }> = {
    PAID: { label: 'pagado', cls: 'text-ok bg-ok/10 border-ok' },
    PENDING: { label: 'pendiente', cls: 'text-warn bg-warn/10 border-warn' },
    EXPIRED: { label: 'expiró', cls: 'text-ink-mute bg-paper-dark border-ink/20' },
    CANCELLED: { label: 'cancelado', cls: 'text-err bg-err/10 border-err' },
  };
  const meta = labels[status] ?? labels.PENDING;
  return (
    <div className="flex flex-col items-end gap-1 flex-shrink-0">
      <span className={`text-xs px-2 py-0.5 border ${meta.cls}`}>{meta.label}</span>
      {status === 'PAID' && wapuStatus === 'SENT' && (
        <span className="text-xs text-ok">ARS enviados</span>
      )}
      {status === 'PAID' && wapuStatus === 'PENDING' && (
        <span className="text-xs text-warn">ARS en proceso</span>
      )}
      {status === 'PAID' && wapuStatus === 'FAILED' && (
        <span className="text-xs text-err">offramp falló</span>
      )}
    </div>
  );
}
