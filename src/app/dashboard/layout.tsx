import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Zap, Store, Package, ShoppingBag, Repeat, LogOut, Settings, ExternalLink } from 'lucide-react';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { shortNpub } from '@/lib/utils';
import { LogoutButton } from '@/components/LogoutButton';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.userId) redirect('/login');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect('/login');

  // Si necesita setup, lo mandamos ahí (excepto si ya está en /setup)
  // Esto se maneja en cada página individualmente para no redirigir desde un layout

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="md:w-64 md:min-h-screen border-b-2 md:border-b-0 md:border-r-2 border-ink bg-paper-warm flex flex-col">
        <div className="p-6 border-b-2 border-ink">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="w-5 h-5 fill-bolt stroke-ink" />
            <span className="font-display font-black tracking-tight text-xl">
              TIENDITA
            </span>
          </Link>
        </div>

        {/* Tienda info */}
        <div className="p-6 border-b border-ink/20">
          <p className="text-receipt mb-1">tu tienda</p>
          <p className="font-display text-lg font-bold leading-tight">
            {user.shopName}
          </p>
          {!user.lightningAddress.startsWith('temp_') && (
            <Link
              href={`/${user.slug}`}
              target="_blank"
              className="text-sm text-ink-soft hover:text-ink underline-offset-4 hover:underline mt-1 inline-flex items-center gap-1"
            >
              ver tienda pública <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/dashboard" icon={Store}>
            inicio
          </NavLink>
          <NavLink href="/dashboard/products" icon={Package}>
            productos
          </NavLink>
          <NavLink href="/dashboard/orders" icon={ShoppingBag}>
            ventas
          </NavLink>
          <NavLink href="/dashboard/subscriptions" icon={Repeat}>
            suscripciones
          </NavLink>
          <NavLink href="/dashboard/settings" icon={Settings}>
            configuración
          </NavLink>
        </nav>

        {/* User footer */}
        <div className="p-4 border-t-2 border-ink">
          <p className="text-receipt mb-1">conectado como</p>
          <p className="font-mono text-xs truncate" title={user.npub}>
            {shortNpub(user.npub)}
          </p>
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 md:p-10 max-w-5xl">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-paper-dark text-ink-soft hover:text-ink transition-colors"
    >
      <Icon className="w-4 h-4" />
      <span>{children}</span>
    </Link>
  );
}
