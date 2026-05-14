'use client';

import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { slugify } from '@/lib/utils';

interface Initial {
  shopName: string;
  slug: string;
  shopDescription: string;
  shopAccent: string;
  lightningAddress: string;
  wapuAlias: string;
  wapuReceiverName: string;
}

const ACCENT_PRESETS = [
  { color: '#FFD400', label: 'Lightning' },
  { color: '#FF6B35', label: 'Tomate' },
  { color: '#2D6A4F', label: 'Verde' },
  { color: '#9B2226', label: 'Borgoña' },
  { color: '#3A86FF', label: 'Azul' },
  { color: '#7209B7', label: 'Violeta' },
];

export function SettingsForm({ initial }: { initial: Initial }) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Initial>(key: K, value: Initial[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/shop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: data.shopName,
          slug: slugify(data.slug),
          shopDescription: data.shopDescription || undefined,
          shopAccent: data.shopAccent,
          lightningAddress: data.lightningAddress,
          wapuAlias: data.wapuAlias || undefined,
          wapuReceiverName: data.wapuReceiverName || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Error al guardar');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      {/* Tienda */}
      <section className="card-paper space-y-5">
        <h2 className="font-display text-xl font-bold">Información de la tienda</h2>

        <div>
          <label className="text-receipt mb-2 block">nombre</label>
          <input
            className="input-paper"
            value={data.shopName}
            onChange={(e) => update('shopName', e.target.value)}
            required
            maxLength={60}
          />
        </div>

        <div>
          <label className="text-receipt mb-2 block">URL pública</label>
          <div className="flex items-center bg-paper-warm border-2 border-ink/30 focus-within:border-ink shadow-paper-sm">
            <span className="px-3 py-2 text-ink-mute font-mono text-sm border-r border-ink/20">
              tiendita.app/
            </span>
            <input
              className="flex-1 px-3 py-2 bg-transparent focus:outline-none font-mono"
              value={data.slug}
              onChange={(e) => update('slug', slugify(e.target.value))}
              required
            />
          </div>
        </div>

        <div>
          <label className="text-receipt mb-2 block">descripción</label>
          <textarea
            className="input-paper resize-none"
            rows={3}
            value={data.shopDescription}
            onChange={(e) => update('shopDescription', e.target.value)}
            maxLength={280}
          />
        </div>

        <div>
          <label className="text-receipt mb-2 block">color de acento</label>
          <div className="flex flex-wrap gap-2">
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.color}
                type="button"
                onClick={() => update('shopAccent', p.color)}
                className={`w-10 h-10 border-2 ${
                  data.shopAccent === p.color ? 'border-ink shadow-paper' : 'border-ink/30'
                }`}
                style={{ backgroundColor: p.color }}
                title={p.label}
                aria-label={p.label}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Lightning */}
      <section className="card-paper space-y-5">
        <h2 className="font-display text-xl font-bold">Lightning</h2>

        <div>
          <label className="text-receipt mb-2 block">tu lightning address</label>
          <input
            className="input-paper font-mono"
            value={data.lightningAddress}
            onChange={(e) => update('lightningAddress', e.target.value.trim())}
            required
          />
          <p className="text-receipt mt-2 text-ink-mute">
            todos los pagos van directo acá, tiendita no custodia nada
          </p>
        </div>
      </section>

      {/* Wapu */}
      <section className="card-paper space-y-5">
        <h2 className="font-display text-xl font-bold">Offramp ARS · Wapu</h2>

        <div>
          <label className="text-receipt mb-2 block">alias bancario o CBU</label>
          <input
            className="input-paper font-mono"
            value={data.wapuAlias}
            onChange={(e) => update('wapuAlias', e.target.value.trim())}
            placeholder="ej: panaderia.barrio"
          />
        </div>

        <div>
          <label className="text-receipt mb-2 block">nombre del titular</label>
          <input
            className="input-paper"
            value={data.wapuReceiverName}
            onChange={(e) => update('wapuReceiverName', e.target.value)}
            placeholder="Juan Pérez"
          />
        </div>
      </section>

      {error && (
        <div className="border-l-4 border-err bg-err/5 p-3 text-err text-sm">
          ⚠ {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-bolt">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> guardando…
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4 text-ok" /> guardado
            </>
          ) : (
            'guardar cambios'
          )}
        </button>
      </div>
    </form>
  );
}
