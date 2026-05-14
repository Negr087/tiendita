import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Zap, Plus, ArrowRight, ShoppingBag, Repeat, Package } from 'lucide-react';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { formatArs, formatSats, timeAgo } from '@/lib/utils';
import { CopyButton } from '@/components/CopyButton';

export default async function DashboardHome() {
  const session = await getSession();
  if (!session.userId) redirect('/login');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect('/login');

  if (user.lightningAddress.startsWith('temp_')) {
    redirect('/dashboard/setup');
  }

  // Métricas
  const [productsCount, paidOrders, activeSubscriptions, recentOrders] = await Promise.all([
    db.product.count({ where: { userId: user.id, active: true } }),
    db.order.findMany({
      where: { userId: user.id, status: 'PAID' },
      select: { amountArs: true, amountSats: true },
    }),
    db.subscription.count({
      where: {
        product: { userId: user.id },
        status: 'ACTIVE',
      },
    }),
    db.order.findMany({
      where: { userId: user.id, status: 'PAID' },
      include: { product: { select: { name: true, type: true } } },
      orderBy: { paidAt: 'desc' },
      take: 5,
    }),
  ]);

  const totalArs = paidOrders.reduce((s, o) => s + o.amountArs, 0);
  const totalSats = paidOrders.reduce((s, o) => s + o.amountSats, 0);
  const shopUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
  const fullShopUrl = `${shopUrl}/${user.slug}`;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-receipt mb-1">dashboard</p>
          <h1 className="font-display text-4xl md:text-5xl font-black leading-tight">
            Hola, {user.displayName ?? user.shopName.split(' ')[0]}.
          </h1>
        </div>
        <Link href="/dashboard/products" className="btn-bolt">
          <Plus className="w-4 h-4" /> nuevo producto
        </Link>
      </div>

      {/* URL pública destacada */}
      <div className="card-paper relative">
        <div className="absolute -top-3 -right-3 stamp bg-bolt border-ink hidden md:block">
          tu URL
        </div>
        <p className="text-receipt mb-2">compartí este link con tus clientes</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 font-mono text-lg md:text-xl font-bold truncate">
            {fullShopUrl}
          </div>
          <CopyButton text={fullShopUrl} />
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-ink border-2 border-ink shadow-paper">
        <Metric
          label="ventas pagadas"
          value={paidOrders.length.toString()}
          icon={ShoppingBag}
        />
        <Metric
          label="recaudado en ars"
          value={formatArs(totalArs)}
        />
        <Metric
          label="recaudado en sats"
          value={formatSats(totalSats)}
          mono
        />
        <Metric
          label="suscripciones activas"
          value={activeSubscriptions.toString()}
          icon={Repeat}
        />
      </div>

      {/* Productos count + acciones */}
      {productsCount === 0 ? (
        <div className="card-paper text-center py-12">
          <Package className="w-12 h-12 mx-auto mb-4 text-ink-mute" />
          <h2 className="font-display text-2xl font-bold mb-2">
            Todavía no cargaste productos
          </h2>
          <p className="text-ink-soft mb-6 max-w-md mx-auto">
            Tu tienda está creada, pero está vacía. Cargá tu primer producto
            para empezar a vender.
          </p>
          <Link href="/dashboard/products" className="btn-bolt">
            <Plus className="w-4 h-4" /> cargar mi primer producto
          </Link>
        </div>
      ) : (
        <div>
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-display text-2xl font-bold">Ventas recientes</h2>
            <Link href="/dashboard/orders" className="btn-ghost text-sm">
              ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="card-paper-flat text-center py-8 text-ink-soft">
              Todavía no tuviste ventas. Compartí tu URL para empezar.
            </div>
          ) : (
            <div className="card-paper p-0 overflow-hidden">
              {recentOrders.map((order, i) => (
                <div
                  key={order.id}
                  className={`flex items-center gap-4 p-4 ${
                    i > 0 ? 'border-t border-ink/10' : ''
                  }`}
                >
                  <Zap className="w-4 h-4 fill-bolt stroke-ink flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{order.product.name}</p>
                    <p className="text-receipt">
                      {order.product.type === 'SUBSCRIPTION' && order.cycleNumber
                        ? `ciclo ${order.cycleNumber} · `
                        : ''}
                      {order.paidAt ? timeAgo(order.paidAt) : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold">
                      {formatArs(order.amountArs)}
                    </p>
                    <p className="text-receipt">{formatSats(order.amountSats)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  mono?: boolean;
}) {
  return (
    <div className="bg-paper-warm p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-receipt">{label}</p>
        {Icon && <Icon className="w-4 h-4 text-ink-mute" />}
      </div>
      <p
        className={`font-display text-2xl md:text-3xl font-black ${
          mono ? 'font-mono text-xl md:text-2xl' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}
