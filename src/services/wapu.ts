/**
 * Wapu service — offramp Lightning -> ARS
 * Docs: https://docs.wapupay.com/api-docs
 * Auth: X-API-Key header
 * Prod: https://be-prod.wapu.app
 * Staging: https://be-stage.wapu.app
 *
 * Flujo principal (WAPU_MODE=real):
 *   1. createWapuLightningInvoice → crea tentativa + emite instrucciones de fondeo
 *      Devuelve un bolt11 de Wapu que el cliente debe pagar.
 *   2. Wapu detecta el pago y transfiere ARS al alias automáticamente.
 *
 * Flujo mock (WAPU_MODE=mock):
 *   - createWapuLightningInvoice devuelve null → se usa Lightning Address del comerciante.
 *   - executeWapuWithdrawal simula el retiro para demos.
 */

export interface WapuWithdrawalRequest {
  amountArs: number;
  alias: string;
  receiverName: string;
  externalId: string;
}

export interface WapuWithdrawalResult {
  txId: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  message?: string;
  mockedAt?: number;
}

export interface WapuLightningInvoice {
  bolt11: string;
  verifyUrl: string | null;
  tentativeId: string;
  amountSats: number | null;
}

// ============================================================================
// Helpers
// ============================================================================

function getBaseUrl(): string {
  return process.env.WAPU_API_URL ?? 'https://be-prod.wapu.app';
}

function apiHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.WAPU_API_KEY ?? '',
  };
}

// ============================================================================
// Direct-Fiat con Lightning — flujo real de Wapu
// ============================================================================

/**
 * Crea una tentativa direct-fiat con fondeo Lightning.
 * Devuelve el bolt11 de Wapu para que el cliente pague; Wapu envía ARS al alias.
 * Devuelve null en modo mock (el caller usa Lightning Address del comerciante).
 */
export async function createWapuLightningInvoice(req: {
  amountArs: number;
  alias: string;
  receiverName: string;
}): Promise<WapuLightningInvoice | null> {
  if ((process.env.WAPU_MODE ?? 'mock') !== 'real') return null;
  if (!process.env.WAPU_API_KEY) return null;

  const base = getBaseUrl();
  const headers = apiHeaders();

  // Paso 1: crear tentativa y congelar quote
  const tentativeRes = await fetch(`${base}/transactions/direct-fiat/tentatives`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amount_ars: req.amountArs,
      type: 'fast_fiat_transfer',
      alias: req.alias,
      receiver_name: req.receiverName,
      funding_method: 'LIGHTNING',
      network: 'LIGHTNING',
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!tentativeRes.ok) {
    const text = await tentativeRes.text();
    throw new Error(`Wapu tentativa falló: HTTP ${tentativeRes.status} — ${text.slice(0, 200)}`);
  }

  const tentative = await tentativeRes.json();
  const tentativeId: string = tentative.tentative_id;
  const amountSats: number | null = tentative.funding_amount_sat ?? null;

  // Paso 2: emitir instrucciones de fondeo → devuelve invoice Lightning
  const fundingRes = await fetch(
    `${base}/transactions/direct-fiat/tentatives/${tentativeId}/funding`,
    {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!fundingRes.ok) {
    const text = await fundingRes.text();
    throw new Error(`Wapu funding falló: HTTP ${fundingRes.status} — ${text.slice(0, 200)}`);
  }

  const funding = await fundingRes.json();

  if (!funding.lightning_pr) {
    throw new Error('Wapu no devolvió invoice Lightning en las instrucciones de fondeo');
  }

  return {
    bolt11: funding.lightning_pr as string,
    verifyUrl: (funding.lightning_verify_url as string) ?? null,
    tentativeId,
    amountSats,
  };
}

/**
 * Consulta el estado de una tentativa direct-fiat.
 * Devuelve null en modo mock o si no hay API key.
 */
export async function getWapuTentativeStatus(
  tentativeId: string,
): Promise<{ status: string } | null> {
  if ((process.env.WAPU_MODE ?? 'mock') !== 'real') return null;
  if (!process.env.WAPU_API_KEY) return null;

  try {
    const res = await fetch(
      `${getBaseUrl()}/transactions/direct-fiat/tentatives/${tentativeId}`,
      {
        headers: apiHeaders(),
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { status: data.status as string };
  } catch {
    return null;
  }
}

// ============================================================================
// Mock — simula el retiro para demos (WAPU_MODE=mock)
// Usado cuando Wapu no está configurado o como fallback en tests.
// ============================================================================

const MOCK_DELAY_MS = 1500;

export async function executeWapuWithdrawal(
  req: WapuWithdrawalRequest,
): Promise<WapuWithdrawalResult> {
  if ((process.env.WAPU_MODE ?? 'mock') !== 'mock') {
    // En modo real, este path solo se alcanza como fallback si createWapuLightningInvoice
    // falló durante la creación de la orden. Reportamos FAILED para que el comerciante lo sepa.
    return {
      txId: `fallback_${Date.now()}`,
      status: 'FAILED',
      message: 'Wapu real: el invoice Lightning no fue generado por Wapu en esta orden.',
    };
  }

  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
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
