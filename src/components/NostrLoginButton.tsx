'use client';

/**
 * NostrLoginButton — login con extensión Nostr (NIP-07)
 *
 * Flujo:
 * 1. Click → POST /api/auth/challenge → devuelve eventTemplate
 * 2. window.nostr.signEvent(eventTemplate) → firma con la nsec del usuario
 * 3. POST /api/auth/verify con el evento firmado
 * 4. Si OK → redirige al dashboard
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: {
        kind: number;
        content: string;
        tags: string[][];
        created_at: number;
      }): Promise<{
        id: string;
        pubkey: string;
        kind: number;
        content: string;
        tags: string[][];
        created_at: number;
        sig: string;
      }>;
    };
  }
}

export function NostrLoginButton() {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'requesting' | 'signing' | 'verifying'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    if (!window.nostr) {
      setError(
        'No detectamos una extensión Nostr. Instalá Alby o nos2x desde la tienda de tu navegador.',
      );
      return;
    }

    try {
      setState('requesting');
      const challengeRes = await fetch('/api/auth/challenge', { method: 'POST' });
      if (!challengeRes.ok) throw new Error('No pudimos generar el challenge');
      const { eventTemplate } = await challengeRes.json();

      setState('signing');
      const signed = await window.nostr.signEvent(eventTemplate);

      setState('verifying');
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedEvent: signed }),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(data.error ?? 'Falló la verificación');

      // Redirigir
      if (data.user.needsSetup) {
        router.push('/dashboard/setup');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setState('idle');
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }

  const label = {
    idle: 'conectar con Nostr',
    requesting: 'preparando challenge…',
    signing: 'firmando con tu extensión…',
    verifying: 'verificando firma…',
  }[state];

  return (
    <div className="space-y-3">
      <button
        onClick={handleLogin}
        disabled={state !== 'idle'}
        className="btn-bolt w-full justify-center text-lg py-3.5"
      >
        {state === 'idle' ? (
          <>
            <Zap className="w-5 h-5" /> {label}
          </>
        ) : (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> {label}
          </>
        )}
      </button>

      {error && (
        <div className="card-paper-flat border-err bg-err/5 text-err text-sm">
          ⚠ {error}
        </div>
      )}

      <p className="text-receipt text-center">
        no usamos passwords · solo tu llave nostr
      </p>
    </div>
  );
}
