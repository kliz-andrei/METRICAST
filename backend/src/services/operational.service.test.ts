import { describe, expect, it, vi } from 'vitest';
import { OperationalService } from './operational.service.js';

const repository = (summary: { count: number; netSales: number }) => ({
  summary: vi.fn(async () => ({ _count: { id: summary.count }, _sum: { netSales: summary.netSales }, _avg: { guestCount: 2 } })),
  hourlyOperations: vi.fn(async () => []),
  dailyOperations: vi.fn(async () => [
    { date: '2026-08-01', transactionCount: BigInt(2), revenue: 300, guestCount: BigInt(4) },
    { date: '2026-08-02', transactionCount: BigInt(2), revenue: 700, guestCount: BigInt(4) },
  ]),
  paymentMethodDistribution: vi.fn(async () => []),
  orderTypeDistribution: vi.fn(async () => []),
  salesChannelDistribution: vi.fn(async () => []),
  productDemand: vi.fn(async () => []),
});

describe('OperationalService average sales per transaction', () => {
  it('uses total Net Sales divided by completed transactions for the KPI', async () => {
    const service = new OperationalService(repository({ count: 4, netSales: 1000 }) as never);
    const result = await service.getAnalytics({ startDate: '2026-08-01', endDate: '2026-08-31' });
    expect(result.summary.averageSalesPerTransaction).toBe(250);
    expect(result.averageSalesPerTransactionTrend).toEqual([
      expect.objectContaining({ date: '2026-08-01', totalSales: 300, transactionCount: 2, averageSalesPerTransaction: 150 }),
      expect.objectContaining({ date: '2026-08-02', totalSales: 700, transactionCount: 2, averageSalesPerTransaction: 350 }),
    ]);
  });

  it('returns zero rather than an invalid value when no completed transactions exist', async () => {
    const service = new OperationalService(repository({ count: 0, netSales: 0 }) as never);
    const result = await service.getAnalytics({});
    expect(result.summary.averageSalesPerTransaction).toBe(0);
    expect(Number.isFinite(result.summary.averageSalesPerTransaction)).toBe(true);
  });
});
