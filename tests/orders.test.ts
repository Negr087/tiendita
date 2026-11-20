import { describe, it, expect, vi, beforeEach } from 'vitest';

// DB en memoria mínima: simula el UPDATE ... WHERE status = 'PENDING' atómico
const state = { status: 'PENDING' };
const withdrawal = vi.fn(async () => ({ txId: 'tx_1', status: 'SENT' as const }));

vi.mock('@/lib/db', () => ({
  db: {
    order: {
      updateMany: vi.fn(async ({ where }: { where: { status: string } }) => {
        if (state.status !== where.status) return { count: 0 };
        state.status = 'PAID';
        return { count: 1 };
      }),
      findUnique: vi.fn(async () => ({
        id: 'o1',
        amountArs: 1000,
        wapuDepositId: null,
        user: { wapuAlias: 'alias.test', wapuReceiverName: 'Tester' },
      })),
      update: vi.fn(async () => ({})),
    },
  },
}));

vi.mock('@/services/wapu', () => ({
  executeWapuWithdrawal: withdrawal,
  getWapuTentativeStatus: vi.fn(),
}));

const { processPaidOrder } = await import('../src/services/orders');

describe('processPaidOrder', () => {
  beforeEach(() => {
    state.status = 'PENDING';
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
