import { describe, expect, it, vi } from 'vitest';
import { CustomerAnalyticsService } from './customer-analytics.service.js';

describe('CustomerAnalyticsService party-size distribution', () => {
  it('preserves party sizes above 12 from the filtered transaction aggregation', async () => {
    const repository = {
      summary: vi.fn(async () => ({ _sum: { guestCount: 27, netSales: 2_700 }, _avg: { guestCount: 27 }, _count: { id: 1 } })),
      guestDays: vi.fn(async () => [{ date: '2026-08-01', guests: 27n, transactions: 1n }]),
      guestMonths: vi.fn(async () => [{ month: '2026-08', guests: 27n, transactions: 1n }]),
      guestDistribution: vi.fn(async () => [{ guestCount: 27, _count: { id: 1 } }]),
      diningHours: vi.fn(async () => [{ hour: 18, guests: 27n, transactions: 1n }]),
      orderTypeDistribution: vi.fn(async () => [{ orderType: 'Dine In', _sum: { guestCount: 27 }, _count: { id: 1 } }]),
      salesChannelDistribution: vi.fn(async () => [{ salesChannel: 'Restaurant', _sum: { guestCount: 27 }, _count: { id: 1 } }]),
    };
    const service = new CustomerAnalyticsService(repository as never);

    const result = await service.getAnalytics({ startDate: '2026-08-01', endDate: '2026-08-01' });

    expect(result.guestDistribution).toEqual([{ guestCount: 27, transactions: 1 }]);
    expect(result.summary.totalGuestsServed).toBe(27);
    expect(repository.guestDistribution).toHaveBeenCalledWith(expect.objectContaining({ startDate: new Date('2026-08-01T00:00:00.000+08:00'), endDate: new Date('2026-08-01T23:59:59.999+08:00') }));
  });
});
