'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Loader2, Copy, Check, AlertTriangle } from 'lucide-react';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { nip19 } from 'nostr-tools';

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

const LS_KEY = 'tiendita_nsec';

function shortNpub(npub: string) {
  return npub.slice(0, 10) + '...' + npub.slice(-6);
}

type AuthState = 'idle' | 'requesting' | 'signing' | 'verifying';
type View = 'options' | 'show-key';

export function NostrLoginButton() {
  const router = useRouter();
  const [view, setView] = useState<View>('options');
  const [authState, setAuthState] = useState<AuthState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Clave guardada en localStorage (usuario que ya pasó por aquí)
  const [savedNsec, setSavedNsec] = useState<string | null>(null);
  const [savedNpub, setSavedNpub] = useState<string | null>(null);

  // Clave recién generada (pendiente de confirmar)
  const [newNsec, setNewNsec] = useState<string | null>(null);
  const [newNpub, setNewNpub] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    const nsec = localStorage.getItem(LS_KEY);
    if (!nsec) return;
    try {
      const decoded = nip19.decode(nsec);
      if (decoded.type === 'nsec') {
        const pubkey = getPublicKey(decoded.data);
        setSavedNsec(nsec);
        setSavedNpub(nip19.npubEncode(pubkey));
      }
    } catch {
      // clave corrupta, la ignoramos
      localStorage.removeItem(LS_KEY);
    }
  }, []);

  async function loginWithNsec(nsec: string) {
    setError(null);
    try {
      setAuthState('requesting');
      const challengeRes = await fetch('/api/auth/challenge', { method: 'POST' });
      if (!challengeRes.ok) throw new Error('No pudimos generar el challenge');
      const { eventTemplate } = await challengeRes.json();

      setAuthState('signing');
      const decoded = nip19.decode(nsec);
      if (decoded.type !== 'nsec') throw new Error('Llave inválida');
      const signed = finalizeEvent(eventTemplate, decoded.data);

      setAuthState('verifying');
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedEvent: signed }),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(data.error ?? 'Falló la verificación');

      if (data.user.needsSetup) {
        router.push('/dashboard/setup');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setAuthState('idle');
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }

  async function loginWithExtension() {
    setError(null);
    if (!window.nostr) {
      setError(
        'No detectamos una extensión Nostr. Instalá Alby o nos2x desde la tienda de tu navegador.',
      );
      return;
    }
    try {
      setAuthState('requesting');
      const challengeRes = await fetch('/api/auth/challenge', { method: 'POST' });
      if (!challengeRes.ok) throw new Error('No pudimos generar el challenge');
      const { eventTemplate } = await challengeRes.json();

      setAuthState('signing');
      const signed = await window.nostr.signEvent(eventTemplate);

      setAuthState('verifying');
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedEvent: signed }),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(data.error ?? 'Falló la verificación');

      if (data.user.needsSetup) {
        router.push('/dashboard/setup');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setAuthState('idle');
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }

  function handleCreateAccount() {
    const sk = generateSecretKey();
    const nsec = nip19.nsecEncode(sk);
    const npub = nip19.npubEncode(getPublicKey(sk));
    localStorage.setItem(LS_KEY, nsec);
    setNewNsec(nsec);
    setNewNpub(npub);
    setKeySaved(false);
    setCopied(false);
    setView('show-key');
  }

  function handleCopy() {
    if (!newNsec) return;
    navigator.clipboard.writeText(newNsec);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const authLabel: Record<AuthState, string> = {
    idle: '',
    requesting: 'preparando…',
    signing: 'firmando…',
    verifying: 'verificando…',
  };

  const isBusy = authState !== 'idle';

  // ── PANTALLA: mostrando la nsec recién generada ──────────────────────────
  if (view === 'show-key' && newNsec) {
    return (
      <div className="space-y-4">
        <div className="bg-paper-dark border-l-4 border-err p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-err flex-shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong>Esta es tu única llave de acceso.</strong> Si la perdés, perdés tu cuenta.
            Tiendita no puede recuperarla. Guardala en un lugar seguro ahora.
          </div>
        </div>

        <div>
          <p className="text-receipt mb-2">tu nsec (llave privada)</p>
          <div className="flex items-center gap-2 bg-paper-warm border-2 border-ink shadow-paper-sm">
            <code className="flex-1 px-3 py-2 font-mono text-xs break-all leading-relaxed">
              {newNsec}
            </code>
            <button
              onClick={handleCopy}
              className="px-3 py-2 border-l border-ink/20 hover:bg-paper-dark transition-colors flex-shrink-0"
              title="Copiar"
            >
              {copied ? (
                <Check className="w-4 h-4 text-ok" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-receipt mt-1 text-ink-mute text-xs">
            {shortNpub(newNpub ?? '')}
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 border-2 border-ink accent-bolt"
            checked={keySaved}
            onChange={(e) => setKeySaved(e.target.checked)}
          />
          <span className="text-sm leading-relaxed">
            Ya la guardé en un lugar seguro (gestor de contraseñas, papel, etc.)
          </span>
        </label>

        {error && (
          <div className="card-paper-flat border-err bg-err/5 text-err text-sm">
            ⚠ {error}
          </div>
        )}

        <button
          onClick={() => loginWithNsec(newNsec)}
          disabled={!keySaved || isBusy}
          className="btn-bolt w-full justify-center text-lg py-3.5"
        >
          {isBusy ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> {authLabel[authState]}
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" /> crear mi tienda
            </>
          )}
        </button>

        <button
          onClick={() => setView('options')}
          className="w-full text-center text-sm text-ink-mute hover:text-ink underline-offset-4 hover:underline py-1"
        >
          ← volver
        </button>
      </div>
    );
  }

  // ── PANTALLA PRINCIPAL: opciones de login ────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Opción 1: cuenta guardada en localStorage */}
      {savedNpub && (
        <>
          <button
            onClick={() => loginWithNsec(savedNsec!)}
            disabled={isBusy}
            className="btn-bolt w-full justify-center text-lg py-3.5"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> {authLabel[authState]}
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" /> continuar como {shortNpub(savedNpub)}
              </>
            )}
          </button>
          <div className="relative flex items-center gap-3 py-1">
            <div className="flex-1 border-t border-ink/20" />
            <span className="text-receipt text-ink-mute text-xs">o</span>
            <div className="flex-1 border-t border-ink/20" />
          </div>
        </>
      )}

      {/* Opción 2: crear cuenta nueva (sin extensión) */}
      {!savedNpub && (
        <button
          onClick={handleCreateAccount}
          disabled={isBusy}
          className="btn-bolt w-full justify-center text-lg py-3.5"
        >
          <Zap className="w-5 h-5" /> crear cuenta (sin extensión)
        </button>
      )}

      {/* Opción 3: extensión Nostr */}
      <button
        onClick={loginWithExtension}
        disabled={isBusy}
        className="btn-paper w-full justify-center"
      >
        {isBusy && !savedNpub ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> {authLabel[authState]}
          </>
        ) : (
          'conectar con extensión Nostr (Alby, nos2x…)'
        )}
      </button>

      {/* Si ya tiene cuenta guardada, opción de crear una nueva (menos visible) */}
      {savedNpub && (
        <button
          onClick={handleCreateAccount}
          disabled={isBusy}
          className="w-full text-center text-sm text-ink-mute hover:text-ink underline-offset-4 hover:underline py-1"
        >
          crear cuenta nueva
        </button>
      )}

      {error && (
        <div className="card-paper-flat border-err bg-err/5 text-err text-sm">
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
