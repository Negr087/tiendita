/**
 * Price feed — BTC/ARS
 *
 * Usamos Yadio porque:
 * - Es argentino, refleja la cotización informal real
 * - No requiere API key
 * - Tiene buena uptime
 *
 * Cacheamos por 60s para no martillar la API en cada page view.
 */

interface YadioResponse {
  BTC: {
    ARS: number;
  };
  timestamp: number;
}

interface CacheEntry {
  rate: number;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60 * 1000;
let cache: CacheEntry | null = null;

const FALLBACK_RATE = 100_000_000; // ~ ARS por BTC, fallback ultra-conservador

/**
 * Devuelve la tasa actual ARS por 1 BTC.
 * Usa cache de 60s. Si la API falla, usa fallback.
 */
export async function getBtcArsRate(): Promise<number> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rate;
  }

  const url = process.env.PRICE_FEED_URL ?? 'https://api.yadio.io/exrates/BTC';

  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Yadio HTTP ${res.status}`);
    const data = (await res.json()) as YadioResponse;
    const rate = data?.BTC?.ARS;
    if (typeof rate !== 'number' || rate <= 0) {
      throw new Error('Tasa inválida de Yadio');
    }
    cache = { rate, fetchedAt: Date.now() };
    return rate;
  } catch (err) {
    console.warn('[price] Falló Yadio, usando fallback:', err);
    return cache?.rate ?? FALLBACK_RATE;
  }
}

/**
 * Convierte ARS a sats usando la tasa actual.
 * Devuelve enteros (no admite milisats).
 */
export async function arsToSats(amountArs: number): Promise<{
  sats: number;
  rate: number;
}> {
  const rate = await getBtcArsRate(); // ARS por 1 BTC
  const btc = amountArs / rate;
  const sats = Math.ceil(btc * 100_000_000);
  return { sats, rate };
}
