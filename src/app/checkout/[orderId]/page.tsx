import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { CheckoutClient } from '@/components/CheckoutClient';

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function CheckoutPage({ params }: Props) {
  const { orderId } = await params;
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      product: { select: { name: true, type: true, intervalDays: true } },
      user: { select: { shopName: true, slug: true, shopAccent: true } },
    },
  });
  if (!order) notFound();

  return (
    <main className="min-h-screen px-4 py-8 md:py-12">
      <CheckoutClient
        orderId={order.id}
        bolt11={order.invoiceBolt11}
        amountSats={order.amountSats}
        amountArs={order.amountArs}
        rate={order.btcArsRate}
        productName={order.product.name}
        productType={order.product.type}
        intervalDays={order.product.intervalDays ?? null}
        shopName={order.user.shopName}
        shopSlug={order.user.slug}
        initialStatus={order.status}
        expiresAt={order.expiresAt.toISOString()}
        demoMode={process.env.DEMO_MODE === 'true'}
      />
    </main>
  );
}
