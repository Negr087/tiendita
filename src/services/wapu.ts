/**
 * Wapu service — offramp Lightning -> ARS
 *
 * Wapu (https://wapu.shiafu.com) recibe BTC vía Lightning y deposita ARS
 * en un alias/CBU. Es la pieza que permite que el comerciante reciba pesos
 * sin tocar Bitcoin.
 *
 * Dos modos:
 * - "real": llamadas reales a la API de Wapu
 * - "mock": simula los retiros, perfecto para demo/desarrollo
 *
 * Decisión de diseño: por defecto MOCK. Para el pitch del jurado, el ciclo
 * completo se ve sin gastar BTC reales. Para producción, un toggle env.
 */

import { z } from 'zod';

export interface WapuWithdrawalRequest {
  /** Monto en pesos argentinos enteros */
  amountArs: number;
  /** Alias bancario o CBU del destinatario */
  alias: string;
  /** Nombre del titular (para confirmación bancaria) */
  receiverName: string;
  /** Referencia interna para reconciliar */
  externalId: string;
}

export interface WapuWithdrawalResult {
  txId: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  message?: string;
  mockedAt?: number;
}

const RealWapuResponseSchema = z.object({
  tx_id: z.string(),
  status: z.enum(['pending', 'sent', 'failed']),
  message: z.string().optional(),
});

const MOCK_DELAY_MS = 1500; // simular latencia de red para realismo en demo

/**
 * Hace un retiro de ARS via Wapu. Usa mock o real según WAPU_MODE.
 */
export async function executeWapuWithdrawal(
  req: WapuWithdrawalRequest,
): Promise<WapuWithdrawalResult> {
  const mode = process.env.WAPU_MODE ?? 'mock';

  if (mode === 'mock') {
    return mockWithdraw(req);
  }
  return realWithdraw(req);
}

// ============================================================================
// MOCK — simula el retiro para demos
// ============================================================================
async function mockWithdraw(req: WapuWithdrawalRequest): Promise<WapuWithdrawalResult> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));

  // Simulación: 95% éxito, 5% falla aleatoria (para mostrar manejo de errores)
  const fails = Math.random() < 0.05;

  console.log(
    `[wapu:mock] ${fails ? '✗' : '✓'} Retiro $${req.amountArs} → ${req.alias} (${req.receiverName})`,
  );

  if (fails) {
    return {
      txId: `mock_fail_${Date.now()}`,
      status: 'FAILED',
      message: 'Mock: alias no encontrado en banco',
    };
  }

  return {
    txId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: 'SENT',
    message: `[MOCK] Enviados $${req.amountArs.toLocaleString('es-AR')} a ${req.alias}`,
    mockedAt: Date.now(),
  };
}

// ============================================================================
// REAL — endpoint Wapu API
// Basado en wapu CLI: `wapu withdraw ars --type fiat_transfer --alias X --amount Y`
// ============================================================================
async function realWithdraw(req: WapuWithdrawalRequest): Promise<WapuWithdrawalResult> {
  const apiUrl = process.env.WAPU_API_URL ?? 'https://api.wapu.shiafu.com';
  const apiKey = process.env.WAPU_API_KEY;

  if (!apiKey) {
    throw new Error('WAPU_API_KEY no configurada — usá WAPU_MODE=mock o configurá la key');
  }

  const res = await fetch(`${apiUrl}/v1/withdraw/ars`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-External-Id': req.externalId,
    },
    body: JSON.stringify({
      type: 'fiat_transfer',
      alias: req.alias,
      amount: req.amountArs,
      receiver_name: req.receiverName,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      txId: `error_${Date.now()}`,
      status: 'FAILED',
      message: `Wapu HTTP ${res.status}: ${text.slice(0, 200)}`,
    };
  }

  const data = await res.json();
  const parsed = RealWapuResponseSchema.parse(data);

  return {
    txId: parsed.tx_id,
    status: parsed.status === 'pending' ? 'PENDING' : parsed.status === 'sent' ? 'SENT' : 'FAILED',
    message: parsed.message,
  };
}
