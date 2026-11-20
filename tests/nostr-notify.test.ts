import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ db: {} }));
const { buildSaleMessage } = await import('../src/services/nostr-notify');

describe('buildSaleMessage', () => {
  const base = {
    productName: 'Pan casero',
    amountArs: 3000,
    amountSats: 2500,
    buyerLabel: 'Ana',
    buyerContact: '+54 9 11 1234-5678',
    wapuStatus: 'SENT',
    appUrl: 'https://tienditawapu.vercel.app',
  };

  it('incluye producto, comprador, contacto y link al panel', () => {
    const msg = buildSaleMessage(base);
    expect(msg).toContain('Pan casero');
    expect(msg).toContain('Ana');
    expect(msg).toContain('+54 9 11 1234-5678');
    expect(msg).toContain('Pesos enviados');
    expect(msg).toContain('https://tienditawapu.vercel.app/dashboard/orders');
  });

  it('avisa cuando falló el envío de pesos', () => {
    expect(buildSaleMessage({ ...base, wapuStatus: 'FAILED' })).toContain('falló');
  });

  it('omite los datos del comprador si no los hay', () => {
    const msg = buildSaleMessage({ ...base, buyerLabel: null, buyerContact: null });
    expect(msg).not.toContain('👤');
    expect(msg).not.toContain('📇');
  });
});
