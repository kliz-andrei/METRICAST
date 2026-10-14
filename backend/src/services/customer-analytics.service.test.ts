import { describe, expect, it, vi } from 'vitest';
import { CustomerAnalyticsService } from './customer-analytics.service.js';

const guestDay = { date: '2026-08-01', guests: 10n, transactions: 5n };
const diningHour = { hour: 12, guests: 10n, transactions: 5n };

describe('CustomerAnalyticsService guest eligibility', () => {
  it('keeps party metrics guest eligible while Revenue per Guest follows the Dashboard denominator', async () => {
    const repository = {
      summary: vi.fn().mockResolvedValue({ _sum: { netSales: 1_200 }, _avg: { guestCount: 1.25 }, _count: { id: 8 } }),
      guestSummary: vi.fn().mockResolvedValue({
        _sum: { guestCount: 10, netSales: 1_000 },
        _count: { id: 5 },
      }),
      guestDays: vi.fn().mockResolvedValue([guestDay]),
      guestMonths: vi.fn().mockResolvedValue([{ month: '2026-08', guests: 10n, transactions: 5n }]),
      guestDistribution: vi.fn().mockResolvedValue([{ guestCount: 2, _count: { id: 5 } }]),
      diningHours: vi.fn().mockResolvedValue([diningHour]),
      orderTypeDistribution: vi.fn().mockResolvedValue([{ orderType: 'Dine In', _sum: { guestCount: 10 }, _count: { id: 5 } }]),
      salesChannelDistribution: vi.fn().mockResolvedValue([{ salesChannel: 'Dine In', _sum: { guestCount: 10 }, _count: { id: 5 } }]),
    };
    const service = new CustomerAnalyticsService(repository as never);

    await expect(service.getAnalytics({ startDate: '2026-08-01', endDate: '2026-08-01' })).resolves.toMatchObject({
      summary: {
        totalGuestsServed: 10,
        totalTransactions: 8,
        eligibleTransactions: 5,
        averageGuestsPerTransaction: 2,
        averageSpendPerGuest: 120,
        averageTransactionsPerDay: 5,
      },
      guestDistribution: [{ guestCount: 2, transactions: 5 }],
      orderTypeDistribution: [{ orderType: 'Dine In', guests: 10, transactions: 5 }],
      salesChannelDistribution: [{ salesChannel: 'Dine In', guests: 10, transactions: 5 }],
    });
  });

  it('returns a zero guest summary when no transactions have a positive guest count', async () => {
    const repository = {
      summary: vi.fn().mockResolvedValue({ _sum: { netSales: 300 }, _avg: { guestCount: 0 }, _count: { id: 3 } }),
      guestSummary: vi.fn().mockResolvedValue({ _sum: { guestCount: null, netSales: null }, _count: { id: 0 } }),
      guestDays: vi.fn().mockResolvedValue([]),
      guestMonths: vi.fn().mockResolvedValue([]),
      guestDistribution: vi.fn().mockResolvedValue([]),
      diningHours: vi.fn().mockResolvedValue([]),
      orderTypeDistribution: vi.fn().mockResolvedValue([]),
      salesChannelDistribution: vi.fn().mockResolvedValue([]),
    };
    const service = new CustomerAnalyticsService(repository as never);

    await expect(service.getAnalytics({})).resolves.toMatchObject({
      summary: {
        totalGuestsServed: 0,
        totalTransactions: 3,
        eligibleTransactions: 0,
        averageGuestsPerTransaction: 0,
        averageSpendPerGuest: 0,
        averageTransactionsPerDay: 0,
      },
      guestDistribution: [],
    });
  });
});
