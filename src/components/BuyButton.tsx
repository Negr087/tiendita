'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Loader2, X } from 'lucide-react';

export function BuyButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          buyerLabel: name.trim(),
          buyerContact: contact.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al iniciar la compra');
      router.push(`/checkout/${data.orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-bolt w-full justify-center">
        comprar con Lightning <Zap className="w-4 h-4" />
      </button>
    );
  }

  return (
    <form onSubmit={handleBuy} className="space-y-3 animate-fade-up">
      <div className="flex items-center justify-between">
        <p className="text-receipt">tus datos para el comercio</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-ink-mute hover:text-ink"
          aria-label="cancelar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <input
        required
        autoFocus
        className="input-paper"
        placeholder="tu nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
      />
      <input
        className="input-paper"
        placeholder="WhatsApp, email o dirección (opcional)"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        maxLength={200}
      />
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="btn-bolt w-full justify-center"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> generando invoice…
          </>
        ) : (
          <>
            ir a pagar <Zap className="w-4 h-4" />
          </>
        )}
      </button>
      {error && <p className="text-err text-sm text-center">⚠ {error}</p>}
    </form>
  );
}
