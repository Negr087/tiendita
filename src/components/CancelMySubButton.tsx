'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function CancelMySubButton({ subId }: { subId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm('¿Seguro que querés cancelar? No se cobrará el próximo ciclo.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/${subId}/cancel`, {
        method: 'POST',
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error ?? 'Error al cancelar');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="btn-paper text-sm flex-shrink-0"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'cancelar'}
    </button>
  );
}
