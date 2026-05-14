'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, ArrowRight, Loader2, Check, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { slugify } from '@/lib/utils';

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [shopName, setShopName] = useState('');
  const [slug, setSlug] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [lightningAddress, setLightningAddress] = useState('');
  const [wapuAlias, setWapuAlias] = useState('');
  const [wapuReceiverName, setWapuReceiverName] = useState('');

  // Verificar que esté logueado
  useEffect(() => {
    fetch('/api/shop')
      .then((r) => {
        if (r.status === 401) {
          router.push('/login');
        }
        return r.json();
      })
      .then((data) => {
        // Si ya tiene tienda configurada (no needsSetup), redirigir al dashboard
        if (data?.id && !data?.needsSetup) {
          router.push('/dashboard');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  // Auto-generar slug a partir del shopName
  useEffect(() => {
    if (shopName && !slug) {
      setSlug(slugify(shopName));
    }
  }, [shopName, slug]);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/shop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName,
          slug: slugify(slug),
          shopDescription: shopDescription || undefined,
          lightningAddress,
          wapuAlias: wapuAlias || undefined,
          wapuReceiverName: wapuReceiverName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setLoading(false);
    }
  }

  const canContinue1 = shopName.length >= 2 && slug.length >= 2;
  const canContinue2 =
    /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(lightningAddress);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <Zap className="w-5 h-5 fill-bolt stroke-ink" />
          <span className="font-display font-black tracking-tight text-xl">TIENDITA</span>
        </Link>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-2 flex-1 border-2 border-ink ${
                n <= step ? 'bg-bolt' : 'bg-paper-warm'
              }`}
            />
          ))}
        </div>

        {/* STEP 1: tienda */}
        {step === 1 && (
          <div className="card-paper animate-fade-up">
            <p className="text-receipt mb-2">paso 1 de 3</p>
            <h1 className="font-display text-3xl md:text-4xl font-black mb-2 leading-tight">
              ¿Cómo se llama tu tienda?
            </h1>
            <p className="text-ink-soft mb-8">
              Esto es lo que van a ver tus clientes arriba de todo.
            </p>

            <div className="space-y-5">
              <div>
                <label className="text-receipt mb-2 block">nombre de la tienda</label>
                <input
                  className="input-paper text-lg"
                  placeholder="Ej: Panadería del Barrio"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-receipt mb-2 block">tu URL</label>
                <div className="flex items-center bg-paper-warm border-2 border-ink/30 focus-within:border-ink shadow-paper-sm">
                  <span className="px-3 py-2 text-ink-mute font-mono text-sm border-r border-ink/20">
                    tiendita.app/
                  </span>
                  <input
                    className="flex-1 px-3 py-2 bg-transparent focus:outline-none font-mono"
                    placeholder="panaderia-del-barrio"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                  />
                </div>
                <p className="text-receipt mt-2 text-ink-mute">
                  solo letras minúsculas, números y guiones
                </p>
              </div>

              <div>
                <label className="text-receipt mb-2 block">
                  descripción (opcional)
                </label>
                <textarea
                  className="input-paper resize-none"
                  rows={3}
                  placeholder="Pan recién horneado todos los días en Cabildo 2400, Belgrano."
                  value={shopDescription}
                  onChange={(e) => setShopDescription(e.target.value)}
                  maxLength={280}
                />
                <p className="text-receipt mt-1 text-right">
                  {shopDescription.length}/280
                </p>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!canContinue1}
              className="btn-bolt w-full justify-center mt-8 text-lg py-3"
            >
              continuar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: lightning address */}
        {step === 2 && (
          <div className="card-paper animate-fade-up">
            <p className="text-receipt mb-2">paso 2 de 3</p>
            <h1 className="font-display text-3xl md:text-4xl font-black mb-2 leading-tight">
              ¿Dónde recibís los <span className="bg-bolt px-1 -mx-1">sats</span>?
            </h1>
            <p className="text-ink-soft mb-8 leading-relaxed">
              Tu Lightning Address. Es como un email pero para Bitcoin.
              Si no tenés una, podés crear una gratis en{' '}
              <a
                href="https://walletofsatoshi.com"
                target="_blank"
                rel="noopener"
                className="underline font-medium"
              >
                Wallet of Satoshi
              </a>{' '}
              o{' '}
              <a
                href="https://getalby.com"
                target="_blank"
                rel="noopener"
                className="underline font-medium"
              >
                Alby
              </a>
              .
            </p>

            <div className="space-y-5">
              <div>
                <label className="text-receipt mb-2 block">lightning address</label>
                <input
                  className="input-paper text-lg font-mono"
                  placeholder="vos@walletofsatoshi.com"
                  value={lightningAddress}
                  onChange={(e) => setLightningAddress(e.target.value.trim())}
                  autoFocus
                />
                {lightningAddress && !canContinue2 && (
                  <p className="text-err text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> formato inválido —
                    debe ser usuario@dominio.com
                  </p>
                )}
              </div>

              <div className="bg-paper-dark border-l-4 border-ok p-4 text-sm leading-relaxed">
                <strong>⚡ Importante:</strong> Tiendita <strong>nunca toca tus
                fondos</strong>. Cada pago va directo a tu wallet. Si Tiendita
                desaparece mañana, vos seguís cobrando ahí.
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep(1)} className="btn-paper flex-1 justify-center">
                ← atrás
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canContinue2}
                className="btn-bolt flex-[2] justify-center"
              >
                continuar <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: wapu (opcional) */}
        {step === 3 && (
          <div className="card-paper animate-fade-up">
            <p className="text-receipt mb-2">paso 3 de 3 · opcional</p>
            <h1 className="font-display text-3xl md:text-4xl font-black mb-2 leading-tight">
              ¿Querés recibir <span className="italic">pesos</span>?
            </h1>
            <p className="text-ink-soft mb-8 leading-relaxed">
              Si configurás esto, cada vez que un cliente pague, Tiendita
              dispara automáticamente Wapu para enviarte ARS a tu alias bancario.
              Podés saltearte este paso y configurarlo después.
            </p>

            <div className="space-y-5">
              <div>
                <label className="text-receipt mb-2 block">tu alias bancario o CBU</label>
                <input
                  className="input-paper font-mono"
                  placeholder="panaderia.barrio"
                  value={wapuAlias}
                  onChange={(e) => setWapuAlias(e.target.value.trim())}
                />
              </div>

              <div>
                <label className="text-receipt mb-2 block">
                  nombre del titular de la cuenta
                </label>
                <input
                  className="input-paper"
                  placeholder="Juan Pérez"
                  value={wapuReceiverName}
                  onChange={(e) => setWapuReceiverName(e.target.value)}
                />
              </div>

              <div className="bg-paper-dark border-l-4 border-bolt p-4 text-sm leading-relaxed">
                <strong>🥖 Tip:</strong> Si dejás esto en blanco, vas a recibir
                solo en sats. Podés configurar Wapu después desde tu dashboard.
              </div>
            </div>

            {error && (
              <div className="card-paper-flat border-err bg-err/5 text-err text-sm mt-6">
                ⚠ {error}
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep(2)} className="btn-paper flex-1 justify-center">
                ← atrás
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-bolt flex-[2] justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> creando tu tienda…
                  </>
                ) : (
                  <>
                    crear mi tienda <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
