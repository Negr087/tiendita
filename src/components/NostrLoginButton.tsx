'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Loader2, Copy, Check, AlertTriangle, Smartphone } from 'lucide-react';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { nip19 } from 'nostr-tools';
import { BunkerSigner, createNostrConnectURI, parseBunkerInput } from 'nostr-tools/nip46';
import QRCode from 'qrcode';

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

const NIP46_RELAYS = [
  'wss://relay.nsec.app',
  'wss://relay.damus.io',
  'wss://relay.primal.net',
];

function shortNpub(npub: string) {
  return npub.slice(0, 10) + '...' + npub.slice(-6);
}

type AuthState = 'idle' | 'connecting' | 'requesting' | 'signing' | 'verifying';
type View = 'options' | 'show-key' | 'amber';
type AmberTab = 'qr' | 'url';

export function NostrLoginButton() {
  const router = useRouter();
  const [view, setView] = useState<View>('options');
  const [authState, setAuthState] = useState<AuthState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Clave guardada en localStorage
  const [savedNsec, setSavedNsec] = useState<string | null>(null);
  const [savedNpub, setSavedNpub] = useState<string | null>(null);

  // Cuenta nueva generada
  const [newNsec, setNewNsec] = useState<string | null>(null);
  const [newNpub, setNewNpub] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  // Amber / NIP-46
  const [amberTab, setAmberTab] = useState<AmberTab>('qr');
  const [nostrConnectUri, setNostrConnectUri] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [bunkerUrlInput, setBunkerUrlInput] = useState('');
  const [copiedUri, setCopiedUri] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

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
      localStorage.removeItem(LS_KEY);
    }
  }, []);

  // Cuando se monta la pantalla de Amber con pestaña QR, generar el URI
  useEffect(() => {
    if (view !== 'amber' || amberTab !== 'qr') return;
    if (nostrConnectUri) return; // ya generado
    startAmberQR();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, amberTab]);

  // Limpiar abort al desmontar
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // ── Auth helpers ────────────────────────────────────────────────────────

  async function getChallenge() {
    const res = await fetch('/api/auth/challenge', { method: 'POST' });
    if (!res.ok) throw new Error('No pudimos generar el challenge');
    return res.json() as Promise<{ eventTemplate: { kind: number; content: string; tags: string[][]; created_at: number } }>;
  }

  async function verifyAndRedirect(signedEvent: unknown) {
    setAuthState('verifying');
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedEvent }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Falló la verificación');
    if (data.user.needsSetup) {
      router.push('/dashboard/setup');
    } else {
      router.push('/dashboard');
    }
  }

  // ── Login con nsec local ────────────────────────────────────────────────

  async function loginWithNsec(nsec: string) {
    setError(null);
    try {
      setAuthState('requesting');
      const { eventTemplate } = await getChallenge();
      setAuthState('signing');
      const decoded = nip19.decode(nsec);
      if (decoded.type !== 'nsec') throw new Error('Llave inválida');
      const signed = finalizeEvent(eventTemplate, decoded.data);
      await verifyAndRedirect(signed);
    } catch (err) {
      setAuthState('idle');
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }

  // ── Login con extensión NIP-07 ──────────────────────────────────────────

  async function loginWithExtension() {
    setError(null);
    if (!window.nostr) {
      setError('No detectamos una extensión Nostr. Instalá Alby o nos2x desde la tienda de tu navegador.');
      return;
    }
    try {
      setAuthState('requesting');
      const { eventTemplate } = await getChallenge();
      setAuthState('signing');
      const signed = await window.nostr.signEvent(eventTemplate);
      await verifyAndRedirect(signed);
    } catch (err) {
      setAuthState('idle');
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }

  // ── Login con Amber / NIP-46 QR ────────────────────────────────────────

  async function startAmberQR() {
    setError(null);
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const clientSk = generateSecretKey();
      const clientPk = getPublicKey(clientSk);

      const bytes = new Uint8Array(8);
      crypto.getRandomValues(bytes);
      const secret = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

      const uri = createNostrConnectURI({
        clientPubkey: clientPk,
        relays: NIP46_RELAYS,
        secret,
        name: 'Tiendita',
      });

      setNostrConnectUri(uri);

      // Generar QR
      const qr = await QRCode.toDataURL(uri, { width: 220, margin: 2 });
      setQrDataUrl(qr);

      setAuthState('connecting');

      // Esperar a que Amber se conecte (max 5 min)
      const signer = await BunkerSigner.fromURI(clientSk, uri, {}, abort.signal);

      if (abort.signal.aborted) return;

      // Ahora firmar el challenge
      setAuthState('requesting');
      const { eventTemplate } = await getChallenge();
      setAuthState('signing');
      const signed = await signer.signEvent(eventTemplate);
      await signer.close();
      await verifyAndRedirect(signed);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setAuthState('idle');
      setError(err instanceof Error ? err.message : 'Error al conectar con Amber');
    }
  }

  // ── Login con bunker:// URL ─────────────────────────────────────────────

  async function loginWithBunkerUrl() {
    setError(null);
    const input = bunkerUrlInput.trim();
    if (!input) return;
    try {
      setAuthState('connecting');
      const bp = await parseBunkerInput(input);
      if (!bp) throw new Error('URL inválida — debe ser bunker://... o usuario@dominio.com');

      const clientSk = generateSecretKey();
      const signer = BunkerSigner.fromBunker(clientSk, bp);
      await signer.connect();

      setAuthState('requesting');
      const { eventTemplate } = await getChallenge();
      setAuthState('signing');
      const signed = await signer.signEvent(eventTemplate);
      await signer.close();
      await verifyAndRedirect(signed);
    } catch (err) {
      setAuthState('idle');
      setError(err instanceof Error ? err.message : 'Error al conectar');
    }
  }

  // ── Crear cuenta nueva ──────────────────────────────────────────────────

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

  function handleCopyKey() {
    if (!newNsec) return;
    navigator.clipboard.writeText(newNsec);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyUri() {
    if (!nostrConnectUri) return;
    navigator.clipboard.writeText(nostrConnectUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  }

  function handleBack() {
    abortRef.current?.abort();
    abortRef.current = null;
    setAuthState('idle');
    setError(null);
    setNostrConnectUri(null);
    setQrDataUrl(null);
    setView('options');
  }

  function handleRegenQR() {
    setNostrConnectUri(null);
    setQrDataUrl(null);
    setAuthState('idle');
    startAmberQR();
  }

  const isBusy = authState !== 'idle';

  const authLabel: Partial<Record<AuthState, string>> = {
    connecting: 'esperando conexión…',
    requesting: 'preparando…',
    signing: 'firmando…',
    verifying: 'verificando…',
  };

  // ── VISTA: llave nueva ──────────────────────────────────────────────────
  if (view === 'show-key' && newNsec) {
    return (
      <div className="space-y-4">
        <div className="bg-paper-dark border-l-4 border-err p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-err flex-shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong>Esta es tu única llave de acceso.</strong> Si la perdés, perdés
            tu cuenta para siempre. Guardala ahora.
          </div>
        </div>

        <div>
          <p className="text-receipt mb-2">tu nsec (llave privada)</p>
          <div className="flex items-center gap-2 bg-paper-warm border-2 border-ink shadow-paper-sm">
            <code className="flex-1 px-3 py-2 font-mono text-xs break-all leading-relaxed">
              {newNsec}
            </code>
            <button
              onClick={handleCopyKey}
              className="px-3 py-2 border-l border-ink/20 hover:bg-paper-dark transition-colors flex-shrink-0"
              title="Copiar"
            >
              {copied ? <Check className="w-4 h-4 text-ok" /> : <Copy className="w-4 h-4" />}
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
          <div className="card-paper-flat border-err bg-err/5 text-err text-sm">⚠ {error}</div>
        )}

        <button
          onClick={() => loginWithNsec(newNsec)}
          disabled={!keySaved || isBusy}
          className="btn-bolt w-full justify-center text-lg py-3.5"
        >
          {isBusy ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> {authLabel[authState]}</>
          ) : (
            <><Zap className="w-5 h-5" /> crear mi tienda</>
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

  // ── VISTA: Amber / NIP-46 ───────────────────────────────────────────────
  if (view === 'amber') {
    return (
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex bg-paper-dark border-2 border-ink p-1 gap-1">
          <button
            onClick={() => setAmberTab('qr')}
            className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
              amberTab === 'qr' ? 'bg-bolt text-ink' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {isMobile ? 'Amber' : 'QR / Amber'}
          </button>
          <button
            onClick={() => setAmberTab('url')}
            className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
              amberTab === 'url' ? 'bg-bolt text-ink' : 'text-ink-soft hover:text-ink'
            }`}
          >
            bunker:// URL
          </button>
        </div>

        {amberTab === 'qr' ? (
          <div className="space-y-4">
            {!nostrConnectUri ? (
              <div className="py-10 flex flex-col items-center gap-3 text-ink-soft">
                <Loader2 className="w-6 h-6 animate-spin" />
                <p className="text-sm">Generando conexión…</p>
              </div>
            ) : isMobile ? (
              // En móvil: botón de deep link a Amber
              <div className="space-y-3">
                <a
                  href={nostrConnectUri}
                  className="btn-bolt w-full justify-center text-lg py-3.5"
                >
                  <Smartphone className="w-5 h-5" /> Abrir en Amber
                </a>
                <p className="text-receipt text-center text-xs">
                  Amber te pedirá aprobar la conexión. Después volvé acá.
                </p>
                {authState === 'connecting' && (
                  <div className="flex items-center justify-center gap-2 text-ink-soft text-sm pt-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> esperando aprobación…
                  </div>
                )}
                <button
                  onClick={handleCopyUri}
                  className="w-full flex items-center justify-center gap-2 text-xs text-ink-mute hover:text-ink py-1.5 border border-ink/20 bg-paper-warm"
                >
                  {copiedUri ? <Check className="w-3 h-3 text-ok" /> : <Copy className="w-3 h-3" />}
                  {copiedUri ? '¡copiado!' : 'copiar URI de conexión'}
                </button>
              </div>
            ) : (
              // En desktop: mostrar QR
              <div className="space-y-3">
                {qrDataUrl ? (
                  <div className="flex justify-center">
                    <div className="bg-white p-3 border-2 border-ink inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrDataUrl} alt="QR Nostr Connect" width={220} height={220} />
                    </div>
                  </div>
                ) : (
                  <div className="py-6 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-ink-soft" />
                  </div>
                )}
                <p className="text-receipt text-center text-xs">
                  Escaneá con Amber, nsec.app u otro signer NIP-46
                </p>
                {authState === 'connecting' && (
                  <div className="flex items-center justify-center gap-2 text-ink-soft text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> esperando conexión…
                  </div>
                )}
                {authState !== 'idle' && authState !== 'connecting' && (
                  <div className="flex items-center justify-center gap-2 text-ink-soft text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> {authLabel[authState]}
                  </div>
                )}
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleCopyUri}
                    className="flex items-center gap-1.5 text-xs text-ink-mute hover:text-ink px-3 py-1.5 border border-ink/20 bg-paper-warm"
                  >
                    {copiedUri ? <Check className="w-3 h-3 text-ok" /> : <Copy className="w-3 h-3" />}
                    {copiedUri ? '¡copiado!' : 'copiar URI'}
                  </button>
                  <button
                    onClick={handleRegenQR}
                    className="text-xs text-ink-mute hover:text-ink px-3 py-1.5 border border-ink/20 bg-paper-warm"
                  >
                    regenerar
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Tab: bunker:// URL
          <div className="space-y-4">
            <div>
              <label className="text-receipt mb-2 block">
                bunker:// URL o NIP-05
              </label>
              <input
                className="input-paper font-mono text-sm"
                placeholder="bunker://pubkey?relay=..."
                value={bunkerUrlInput}
                onChange={(e) => setBunkerUrlInput(e.target.value)}
              />
              <p className="text-receipt mt-1 text-ink-mute text-xs">
                En Amber: Menú → Conectar con bunker → copiar URL
              </p>
            </div>

            {error && (
              <div className="card-paper-flat border-err bg-err/5 text-err text-sm">⚠ {error}</div>
            )}

            <button
              onClick={loginWithBunkerUrl}
              disabled={!bunkerUrlInput.trim() || isBusy}
              className="btn-bolt w-full justify-center py-3"
            >
              {isBusy ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {authLabel[authState]}</>
              ) : (
                'conectar'
              )}
            </button>
          </div>
        )}

        {error && amberTab === 'qr' && (
          <div className="card-paper-flat border-err bg-err/5 text-err text-sm">⚠ {error}</div>
        )}

        <button
          onClick={handleBack}
          className="w-full text-center text-sm text-ink-mute hover:text-ink underline-offset-4 hover:underline py-1"
        >
          ← volver
        </button>
      </div>
    );
  }

  // ── VISTA PRINCIPAL: opciones ───────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Cuenta guardada en localStorage */}
      {savedNpub && (
        <>
          <button
            onClick={() => loginWithNsec(savedNsec!)}
            disabled={isBusy}
            className="btn-bolt w-full justify-center text-lg py-3.5"
          >
            {isBusy ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {authLabel[authState]}</>
            ) : (
              <><Zap className="w-5 h-5" /> continuar como {shortNpub(savedNpub)}</>
            )}
          </button>
          <div className="relative flex items-center gap-3 py-1">
            <div className="flex-1 border-t border-ink/20" />
            <span className="text-receipt text-ink-mute text-xs">o</span>
            <div className="flex-1 border-t border-ink/20" />
          </div>
        </>
      )}

      {/* Crear cuenta nueva */}
      {!savedNpub && (
        <button
          onClick={handleCreateAccount}
          disabled={isBusy}
          className="btn-bolt w-full justify-center text-lg py-3.5"
        >
          <Zap className="w-5 h-5" /> crear cuenta (sin extensión)
        </button>
      )}

      {/* Amber / signer móvil */}
      <button
        onClick={() => { setView('amber'); setAmberTab('qr'); }}
        disabled={isBusy}
        className="btn-paper w-full justify-center"
      >
        <Smartphone className="w-4 h-4" /> conectar con Amber u otro signer
      </button>

      {/* Extensión NIP-07 */}
      <button
        onClick={loginWithExtension}
        disabled={isBusy}
        className="btn-paper w-full justify-center"
      >
        {isBusy && !savedNpub ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> {authLabel[authState]}</>
        ) : (
          'conectar con extensión (Alby, nos2x…)'
        )}
      </button>

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
        <div className="card-paper-flat border-err bg-err/5 text-err text-sm">⚠ {error}</div>
      )}
    </div>
  );
}
