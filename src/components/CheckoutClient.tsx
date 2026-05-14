'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Zap, Copy, Check, ArrowLeft, Sparkles, Repeat, Clock } from 'lucide-react';
import { formatArs, formatSats } from '@/lib/utils';

interface Props {
  orderId: string;
  bolt11: string;
  amountSats: number;
  amountArs: number;
  rate: number;
  productName: string;
  productType: string;
  intervalDays: number | null;
  shopName: string;
  shopSlug: string;
  initialStatus: string;
  expiresAt: string;
  demoMode: boolean;
}

type Status = 'PENDING' | 'PAID' | 'EXPIRED';

export function CheckoutClient(props: Props) {
  const [status, setStatus] = useState<Status>(props.initialStatus as Status);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [wapuStatus, setWapuStatus] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Generar QR del bolt11 al montar
  useEffect(() => {
    const lightningUri = `lightning:${props.bolt11}`;
    QRCode.toDataURL(lightningUri, {
      width: 480,
      margin: 1,
      color: { dark: '#1A1A17', light: '#FBF6E9' },
    }).then(setQrDataUrl);
  }, [props.bolt11]);

  // Countdown del invoice
  useEffect(() => {
    if (status !== 'PENDING') return;
    const expires = new Date(props.expiresAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.floor((expires - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setStatus('EXPIRED');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [props.expiresAt, status]);

  // Polling status cada 2s mientras esté pendiente
  useEffect(() => {
    if (status !== 'PENDING') return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${props.orderId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'PAID') {
          setStatus('PAID');
          setWapuStatus(data.wapuStatus ?? null);
        } else if (data.status === 'EXPIRED') {
          setStatus('EXPIRED');
        }
      } catch {
        // silent — reintentamos en el siguiente tick
      }
    }, 2500);
    return () => clearInterval(id);
  }, [props.orderId, status]);

  function handleCopy() {
    navigator.clipboard.writeText(props.bolt11);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // En modo demo, botón para forzar confirmación (simula pago)
  async function handleDemoConfirm() {
    setConfirming(true);
    try {
      const res = await fetch(`/api/orders/${props.orderId}/status`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('PAID');
        setWapuStatus(data.wapuStatus ?? null);
      }
    } finally {
      setConfirming(false);
    }
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  // ============ ESTADO PAID ============
  if (status === 'PAID') {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card-paper relative overflow-hidden animate-fade-up">
          {/* Big stamp */}
          <div className="absolute top-6 right-6 stamp border-ok text-ok rotate-[-8deg]">
            ✓ PAGADO
          </div>

          <Sparkles className="w-12 h-12 mb-4 text-bolt fill-bolt" />
          <h1 className="font-display text-4xl font-black leading-tight mb-2">
            ¡Listo!
          </h1>
          <p className="text-ink-soft mb-6">Tu pago se confirmó instantáneamente.</p>

          <div className="space-y-3 border-t-2 border-ink/20 pt-6">
            <Row label="producto" value={props.productName} />
            <Row label="tienda" value={props.shopName} />
            <Row label="monto" value={`${formatArs(props.amountArs)} · ${formatSats(props.amountSats)}`} />
            {props.productType === 'SUBSCRIPTION' && props.intervalDays && (
              <Row
                label="próxima renovación"
                value={`en ${props.intervalDays} días`}
                icon={<Repeat className="w-3 h-3" />}
              />
            )}
          </div>

          {/* Estado del Wapu offramp */}
          {wapuStatus && (
            <div className="mt-6 border-t-2 border-ink/20 pt-6">
              <p className="text-receipt mb-2">offramp ARS via Wapu</p>
              {wapuStatus === 'SENT' && (
                <p className="flex items-center gap-2 text-ok">
                  <Check className="w-4 h-4" /> Pesos enviados al alias del comerciante
                </p>
              )}
              {wapuStatus === 'PENDING' && (
                <p className="flex items-center gap-2 text-warn">
                  <Clock className="w-4 h-4 animate-pulse" /> Procesando retiro ARS…
                </p>
              )}
              {wapuStatus === 'FAILED' && (
                <p className="text-err text-sm">
                  Wapu falló. El comerciante recibió los sats igual; reintentaremos el offramp.
                </p>
              )}
              {wapuStatus === 'NOT_CONFIGURED' && (
                <p className="text-ink-soft text-sm">
                  El comerciante recibió en sats. No tiene Wapu configurado.
                </p>
              )}
            </div>
          )}

          <Link
            href={`/${props.shopSlug}`}
            className="btn-paper w-full justify-center mt-8"
          >
            <ArrowLeft className="w-4 h-4" /> volver a {props.shopName}
          </Link>
        </div>
      </div>
    );
  }

  // ============ ESTADO EXPIRED ============
  if (status === 'EXPIRED') {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card-paper text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 text-err" />
          <h1 className="font-display text-3xl font-black mb-2">Invoice expirado</h1>
          <p className="text-ink-soft mb-6">
            Pasaron 15 minutos. Generá uno nuevo para pagar.
          </p>
          <Link href={`/${props.shopSlug}`} className="btn-bolt">
            volver a la tienda
          </Link>
        </div>
      </div>
    );
  }

  // ============ ESTADO PENDING ============
  return (
    <div className="max-w-lg mx-auto">
      <Link
        href={`/${props.shopSlug}`}
        className="btn-ghost mb-6 inline-flex"
      >
        <ArrowLeft className="w-4 h-4" /> volver
      </Link>

      <div className="card-paper">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-receipt mb-1">{props.shopName}</p>
            <h1 className="font-display text-2xl md:text-3xl font-bold leading-tight">
              {props.productName}
            </h1>
            {props.productType === 'SUBSCRIPTION' && props.intervalDays && (
              <p className="text-receipt mt-1">
                <Repeat className="w-3 h-3 inline mr-1" />
                renueva cada {props.intervalDays} días
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-display text-2xl font-black">
              {formatArs(props.amountArs)}
            </p>
            <p className="text-receipt">{formatSats(props.amountSats)}</p>
          </div>
        </div>

        <div className="perforated my-4" />

        {/* QR */}
        <div className="flex justify-center my-6">
          {qrDataUrl ? (
            <div className="bg-paper-warm border-2 border-ink p-3 shadow-paper relative">
              <img src={qrDataUrl} alt="Lightning invoice" className="w-full max-w-[280px]" />
              <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 fill-bolt stroke-ink animate-pulse-bolt" />
            </div>
          ) : (
            <div className="w-[280px] h-[280px] shimmer bg-paper-dark" />
          )}
        </div>

        {/* Status */}
        <div className="text-center mb-6">
          <p className="flex items-center justify-center gap-2 text-ink-soft">
            <span className="w-2 h-2 rounded-full bg-warn animate-pulse" />
            esperando tu pago…
          </p>
          {secondsLeft > 0 && (
            <p className="text-receipt mt-1">
              expira en {minutes}:{seconds.toString().padStart(2, '0')}
            </p>
          )}
        </div>

        {/* Botones */}
        <div className="space-y-3">
          <button onClick={handleCopy} className="btn-paper w-full justify-center">
            {copied ? (
              <>
                <Check className="w-4 h-4 text-ok" /> ¡copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> copiar invoice
              </>
            )}
          </button>

          <a href={`lightning:${props.bolt11}`} className="btn-bolt w-full justify-center">
            <Zap className="w-4 h-4" /> abrir en wallet
          </a>
        </div>

        {/* Modo demo: botón para simular el pago */}
        {props.demoMode && (
          <div className="mt-6 border-t-2 border-dashed border-ink/30 pt-6">
            <p className="text-receipt mb-3 text-center">
              modo demo activo · solo para presentación
            </p>
            <button
              onClick={handleDemoConfirm}
              disabled={confirming}
              className="btn-paper w-full justify-center bg-paper-dark"
            >
              {confirming ? 'simulando pago…' : '🧪 simular pago (demo)'}
            </button>
          </div>
        )}

        {/* Tasa */}
        <p className="text-receipt text-center mt-6">
          tasa BTC/ARS: {props.rate.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-receipt flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
