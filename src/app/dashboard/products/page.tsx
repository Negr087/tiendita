import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { ProductsManager } from '@/components/ProductsManager';

export default async function ProductsPage() {
  const session = await getSession();
  if (!session.userId) redirect('/login');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect('/login');
  if (user.lightningAddress.startsWith('temp_')) redirect('/dashboard/setup');

  const products = await db.product.findMany({
    where: { userId: user.id },
    orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-receipt mb-1">productos</p>
        <h1 className="font-display text-4xl md:text-5xl font-black leading-tight">
          Catálogo
        </h1>
        <p className="text-ink-soft mt-2 max-w-xl">
          Cargá productos one-shot o suscripciones recurrentes.
          Tu cliente paga en sats, vos cobrás en pesos.
        </p>
      </div>

      <ProductsManager initialProducts={JSON.parse(JSON.stringify(products))} />
    </div>
  );
}
