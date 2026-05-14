import { describe, it, expect, afterEach } from 'vitest';
import { computeNextBilling } from '../src/services/orders';

describe('computeNextBilling', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses real days when DEMO_MODE is not true', () => {
    process.env.DEMO_MODE = 'false';
    const before = Date.now();
    const next = computeNextBilling(7);
    const expected = before + 7 * 24 * 60 * 60 * 1000;
    expect(next.getTime()).toBeGreaterThanOrEqual(expected - 100);
    expect(next.getTime()).toBeLessThanOrEqual(expected + 100);
  });

  it('uses scaled seconds when DEMO_MODE is true', () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_INTERVAL_MULTIPLIER_SECONDS = '30';
    const before = Date.now();
    const next = computeNextBilling(7);
    // 7 días * 30 seg = 210 seg
    const expected = before + 210 * 1000;
    expect(next.getTime()).toBeGreaterThanOrEqual(expected - 100);
    expect(next.getTime()).toBeLessThanOrEqual(expected + 200);
  });

  it('respects custom multiplier in demo mode', () => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_INTERVAL_MULTIPLIER_SECONDS = '60';
    const before = Date.now();
    const next = computeNextBilling(1);
    const expected = before + 60 * 1000;
    expect(next.getTime()).toBeGreaterThanOrEqual(expected - 100);
    expect(next.getTime()).toBeLessThanOrEqual(expected + 200);
  });
});
