import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { executeWapuWithdrawal } from '../src/services/wapu';

describe('executeWapuWithdrawal (mock mode)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.WAPU_MODE = 'mock';
    // Force success path in tests by stubbing Math.random low
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('returns SENT status with mock txId on success', async () => {
    const result = await executeWapuWithdrawal({
      amountArs: 5000,
      alias: 'panaderia.barrio',
      receiverName: 'Juan Pérez',
      externalId: 'order_123',
    });
    expect(result.status).toBe('SENT');
    expect(result.txId).toMatch(/^mock_/);
    expect(result.message).toContain('5.000');
  });

  it('returns FAILED when random rolls under failure threshold', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01); // below 5% threshold
    const result = await executeWapuWithdrawal({
      amountArs: 1000,
      alias: 'test.alias',
      receiverName: 'Tester',
      externalId: 'fail_test',
    });
    expect(result.status).toBe('FAILED');
    expect(result.txId).toMatch(/^mock_fail_/);
  });

  it('formats ARS amount with thousands separator in message', async () => {
    const result = await executeWapuWithdrawal({
      amountArs: 1_500_000,
      alias: 'big.alias',
      receiverName: 'Big Spender',
      externalId: 'big_test',
    });
    expect(result.message).toContain('1.500.000');
  });
});
