import { describe, it, expect, vi, beforeEach } from 'vitest';

// DB en memoria mínima: simula los UPDATE ... WHERE atómicos
const state = { status: 'PENDING', wapuStatus: null as string | null };
const withdrawal = vi.fn(async () => ({ txId: 'tx_1', status: 'SENT' as const }));

vi.mock('@/lib/db', () => ({
  db: {
    order: {
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if ('status' in where && state.status !== where.status) return { count: 0 };
        if ('wapuStatus' in where && state.wapuStatus !== where.wapuStatus) return { count: 0 };
        Object.assign(state, data);
        return { count: 1 };
      }),
      findUnique: vi.fn(async () => ({
        id: 'o1',
        status: state.status,
        wapuStatus: state.wapuStatus,
        amountArs: 1000,
        wapuDepositId: null,
        user: { wapuAlias: 'alias.test', wapuReceiverName: 'Tester' },
      })),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(state, data);
        return {};
      }),
    },
  },
}));

vi.mock('@/services/wapu', () => ({
  executeWapuWithdrawal: withdrawal,
  getWapuTentativeStatus: vi.fn(),
}));

const { processPaidOrder, retryOfframp } = await import('../src/services/orders');

describe('processPaidOrder', () => {
  beforeEach(() => {
    state.status = 'PENDING';
    state.wapuStatus = null;
    withdrawal.mockClear();
  });

  it('dispara el offramp una sola vez aunque lleguen requests concurrentes', async () => {
    const results = await Promise.all([
      processPaidOrder('o1'),
      processPaidOrder('o1'),
      processPaidOrder('o1'),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(withdrawal).toHaveBeenCalledTimes(1);
  });

  it('no hace nada si la orden ya estaba pagada', async () => {
    state.status = 'PAID';
    expect(await processPaidOrder('o1')).toBe(false);
    expect(withdrawal).not.toHaveBeenCalled();
  });
});

describe('retryOfframp', () => {
  beforeEach(() => {
    state.status = 'PAID';
    state.wapuStatus = 'FAILED';
    withdrawal.mockClear();
  });

  it('reintenta un offramp fallido y guarda el nuevo estado', async () => {
    const r = await retryOfframp('o1');
    expect(r).toEqual({ ok: true, wapuStatus: 'SENT' });
    expect(state.wapuStatus).toBe('SENT');
    expect(withdrawal).toHaveBeenCalledTimes(1);
  });

  it('no reintenta si los pesos ya se enviaron', async () => {
    state.wapuStatus = 'SENT';
    const r = await retryOfframp('o1');
    expect(r.ok).toBe(false);
    expect(withdrawal).not.toHaveBeenCalled();
  });

  it('no reintenta una orden sin pagar', async () => {
    state.status = 'PENDING';
    expect((await retryOfframp('o1')).ok).toBe(false);
    expect(withdrawal).not.toHaveBeenCalled();
  });
});
