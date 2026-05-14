'use client';

import { useState } from 'react';
import { Plus, Loader2, Trash2, Repeat, ShoppingBag, X, Check } from 'lucide-react';
import { formatArs } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceArs: number;
  type: 'ONE_SHOT' | 'SUBSCRIPTION';
  intervalDays: number | null;
  active: boolean;
  createdAt: string;
}

export function ProductsManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showForm, setShowForm] = useState(initialProducts.length === 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceArs, setPriceArs] = useState('');
  const [type, setType] = useState<'ONE_SHOT' | 'SUBSCRIPTION'>('ONE_SHOT');
  const [intervalDays, setIntervalDays] = useState('30');

  function resetForm() {
    setName('');
    setDescription('');
    setPriceArs('');
    setType('ONE_SHOT');
    setIntervalDays('30');
    setError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          priceArs: parseInt(priceArs, 10),
          type,
          intervalDays: type === 'SUBSCRIPTION' ? parseInt(intervalDays, 10) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al crear');
      setProducts([data.product, ...products]);
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(p: Product) {
    const res = await fetch(`/api/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !p.active }),
    });
    if (res.ok) {
      const data = await res.json();
      setProducts(products.map((x) => (x.id === p.id ? data.product : x)));
    }
  }

  async function handleDelete(p: Product) {
    if (!confirm(`¿Borrar "${p.name}"? Las ventas históricas se conservan.`)) return;
    const res = await fetch(`/api/products/${p.id}`, { method: 'DELETE' });
    if (res.ok) {
      setProducts(products.filter((x) => x.id !== p.id));
    }
  }

  return (
    <div className="space-y-6">
      {!showForm && (
        <button onClick={() => setShowForm(true)} className="btn-bolt">
          <Plus className="w-4 h-4" /> nuevo producto
        </button>
      )}

      {/* Formulario */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="card-paper space-y-5 animate-fade-up"
        >
          <div className="flex items-start justify-between">
            <h2 className="font-display text-2xl font-bold">Nuevo producto</h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="text-ink-mute hover:text-ink"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tipo */}
          <div>
            <label className="text-receipt mb-2 block">tipo de producto</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('ONE_SHOT')}
                className={`p-4 border-2 text-left transition-all ${
                  type === 'ONE_SHOT'
                    ? 'border-ink bg-bolt shadow-paper'
                    : 'border-ink/30 bg-paper-warm hover:border-ink/60'
                }`}
              >
                <ShoppingBag className="w-5 h-5 mb-2" />
                <p className="font-medium">Venta única</p>
                <p className="text-xs text-ink-soft">cliente paga una vez</p>
              </button>
              <button
                type="button"
                onClick={() => setType('SUBSCRIPTION')}
                className={`p-4 border-2 text-left transition-all ${
                  type === 'SUBSCRIPTION'
                    ? 'border-ink bg-bolt shadow-paper'
                    : 'border-ink/30 bg-paper-warm hover:border-ink/60'
                }`}
              >
                <Repeat className="w-5 h-5 mb-2" />
                <p className="font-medium">Suscripción</p>
                <p className="text-xs text-ink-soft">se renueva automático</p>
              </button>
            </div>
          </div>

          <div>
            <label className="text-receipt mb-2 block">nombre</label>
            <input
              required
              className="input-paper"
              placeholder="Pan casero (1kg)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </div>

          <div>
            <label className="text-receipt mb-2 block">descripción (opcional)</label>
            <textarea
              className="input-paper resize-none"
              rows={3}
              placeholder="Hogaza de masa madre, fermentación de 24hs."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-receipt mb-2 block">
                precio en pesos {type === 'SUBSCRIPTION' && '/ ciclo'}
              </label>
              <div className="flex items-center bg-paper-warm border-2 border-ink/30 focus-within:border-ink shadow-paper-sm">
                <span className="px-3 py-2 text-ink-mute">$</span>
                <input
                  required
                  type="number"
                  min="1"
                  className="flex-1 px-2 py-2 bg-transparent focus:outline-none"
                  placeholder="5000"
                  value={priceArs}
                  onChange={(e) => setPriceArs(e.target.value)}
                />
              </div>
            </div>

            {type === 'SUBSCRIPTION' && (
              <div>
                <label className="text-receipt mb-2 block">cada cuántos días</label>
                <select
                  className="input-paper"
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(e.target.value)}
                >
                  <option value="7">Semanal (7 días)</option>
                  <option value="14">Quincenal (14 días)</option>
                  <option value="30">Mensual (30 días)</option>
                  <option value="90">Trimestral (90 días)</option>
                  <option value="365">Anual (365 días)</option>
                </select>
              </div>
            )}
          </div>

          {error && (
            <div className="border-l-4 border-err bg-err/5 p-3 text-err text-sm">
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-bolt w-full justify-center"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> creando…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> crear producto
              </>
            )}
          </button>
        </form>
      )}

      {/* Listado */}
      {products.length === 0 && !showForm ? (
        <div className="card-paper-flat text-center py-12 text-ink-soft">
          Todavía no tenés productos. Cargá el primero arriba.
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div
              key={p.id}
              className={`card-paper-flat p-4 flex items-center gap-4 ${
                !p.active ? 'opacity-50' : ''
              }`}
            >
              {p.type === 'SUBSCRIPTION' ? (
                <Repeat className="w-5 h-5 flex-shrink-0" />
              ) : (
                <ShoppingBag className="w-5 h-5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{p.name}</p>
                  {p.type === 'SUBSCRIPTION' && p.intervalDays && (
                    <span className="text-receipt bg-paper-dark px-2 py-0.5">
                      cada {p.intervalDays}d
                    </span>
                  )}
                  {!p.active && (
                    <span className="text-receipt text-err">archivado</span>
                  )}
                </div>
                {p.description && (
                  <p className="text-sm text-ink-soft truncate">{p.description}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-display font-bold">{formatArs(p.priceArs)}</p>
                {p.type === 'SUBSCRIPTION' && (
                  <p className="text-receipt">/ {p.intervalDays}d</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleActive(p)}
                  className="p-2 text-ink-mute hover:text-ink"
                  title={p.active ? 'archivar' : 'reactivar'}
                >
                  {p.active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="p-2 text-ink-mute hover:text-err"
                  title="borrar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
