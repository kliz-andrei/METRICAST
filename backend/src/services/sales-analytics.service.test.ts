import { describe, expect, it, vi } from 'vitest';
import { SalesAnalyticsService } from './sales-analytics.service.js';

describe('SalesAnalyticsService hourly sales', () => {
  it('returns all 24 hours chronologically and preserves zero-sales hours', async () => {
    const repository = {
      hourlyBuckets: vi.fn(async () => [
        { hour: '10', sales: 250, grossSales: 300, transactions: 2n },
        { hour: '23', sales: 100, grossSales: 100, transactions: 1n },
      ]),
    };
    const service = new SalesAnalyticsService(repository as never);

    const result = await service.bucket({ startDate: '2026-08-01', endDate: '2026-08-31' }, 'hour');

    expect(result).toHaveLength(24);
    expect(result[0]).toMatchObject({ hour: '00', sales: 0, transactions: 0 });
    expect(result[10]).toMatchObject({ hour: '10', sales: 250, transactions: 2 });
    expect(result[23]).toMatchObject({ hour: '23', sales: 100, transactions: 1 });
    expect(repository.hourlyBuckets).toHaveBeenCalledWith({ startDate: '2026-08-01', endDate: '2026-08-31' });
  });
});

describe('SalesAnalyticsService discount distribution', () => {
  it('uses all positive discount amounts as the denominator and groups blank categories as unclassified', async () => {
    const repository = {
      discountDistribution: vi.fn(async () => [
        { discountType: 'Senior Citizen', _sum: { discountAmount: 60 }, _count: { id: 2 } },
        { discountType: null, _sum: { discountAmount: 25 }, _count: { id: 1 } },
        { discountType: ' ', _sum: { discountAmount: 15 }, _count: { id: 1 } },
      ]),
    };
    const service = new SalesAnalyticsService(repository as never);

    const result = await service.discountDistribution({});

    expect(result.totalDiscountAmount).toBe(100);
    expect(result.data).toEqual([
      { discountType: 'Senior Citizen', discountAmount: 60, transactionCount: 2, contribution: 60 },
      { discountType: 'Unclassified', discountAmount: 40, transactionCount: 2, contribution: 40 },
    ]);
    expect(repository.discountDistribution).toHaveBeenCalledWith({});
  });
});
