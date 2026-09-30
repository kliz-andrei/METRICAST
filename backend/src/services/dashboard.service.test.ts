import { describe, expect, it, vi } from 'vitest';
import { DashboardService } from './dashboard.service.js';

describe('DashboardService summary', () => {
  it('returns total sales from gross POS sales alongside net sales', async () => {
    const repository = {
      summary: vi.fn().mockResolvedValue({
        _sum: { grossSales: 2_000, netSales: 1_800 },
        _avg: { netSales: 900, guestCount: 2 },
        _count: { id: 2 },
      }),
      customers: vi.fn().mockResolvedValue([{ customerId: 'customer-1' }]),
      products: vi.fn().mockResolvedValue(12),
    };
    const service = new DashboardService(repository as never);

    await expect(service.summary({ startDate: '2026-06-01', endDate: '2026-06-30' }))
      .resolves.toMatchObject({
        totalSales: 2_000,
        netSales: 1_800,
        totalTransactions: 2,
        averageOrderValue: 900,
      });
  });
});
