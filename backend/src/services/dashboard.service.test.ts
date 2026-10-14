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

  it('combines delivery providers into Delivery for channel distribution without changing unknown channels', async () => {
    const repository = {
      transactions: vi.fn().mockResolvedValue([
        { salesChannel: 'Delivery', orderType: 'Delivery', netSales: 100 },
        { salesChannel: ' FoodPanda ', orderType: 'Delivery', netSales: 200 },
        { salesChannel: 'grabfood', orderType: 'Take Out', netSales: 300 },
        { salesChannel: 'Dine In', orderType: 'Dine In', netSales: 400 },
        { salesChannel: 'Catering', orderType: 'Catering', netSales: 500 },
      ]),
    };
    const service = new DashboardService(repository as never);

    await expect(service.distribution('salesChannel', {})).resolves.toEqual([
      { channel: 'Delivery', sales: 600, transactions: 3 },
      { channel: 'Dine In', sales: 400, transactions: 1 },
      { channel: 'Catering', sales: 500, transactions: 1 },
    ]);
  });
});
