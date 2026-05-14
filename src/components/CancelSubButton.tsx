'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2 } from 'lucide-react';

export function CancelSubButton({ subId }: { subId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm('¿Cancelar esta suscripción? El cliente no será cobrado en el próximo ciclo.')) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/${subId}/cancel`, {
        method: 'POST',
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error ?? 'no pudimos cancelar'}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="p-2 text-ink-mute hover:text-err flex-shrink-0"
      title="cancelar suscripción"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <X className="w-4 h-4" />
      )}
    </button>
  );
}
