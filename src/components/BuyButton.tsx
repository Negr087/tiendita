'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Loader2 } from 'lucide-react';

export function BuyButton({
  productId,
  isSubscription,
}: {
  productId: string;
  isSubscription: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al iniciar la compra');
      router.push(`/checkout/${data.orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleBuy}
        disabled={loading}
        className="btn-bolt w-full justify-center"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> generando invoice…
          </>
        ) : (
          <>
            {isSubscription ? 'suscribirme' : 'comprar'} con Lightning <Zap className="w-4 h-4" />
          </>
        )}
      </button>
      {error && (
        <p className="text-err text-sm mt-2 text-center">⚠ {error}</p>
      )}
    </div>
  );
}
