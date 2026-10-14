import { describe, expect, it, vi } from "vitest";
import { OperationalService } from "./operational.service.js";

const createRepository = (
  summary: {
    _sum: { netSales: number | null };
    _avg: { guestCount: number | null };
    _count: { id: number };
  },
  paymentRows: Array<{
    paymentMethod: string;
    transactionId: string;
    _sum: { amount: number | null };
  }> = [],
) => ({
  summary: vi.fn().mockResolvedValue(summary),
  hourlyOperations: vi.fn().mockResolvedValue([]),
  dailyOperations: vi.fn().mockResolvedValue([]),
  paymentMethodDistribution: vi.fn().mockResolvedValue(paymentRows),
  orderTypeDistribution: vi.fn().mockResolvedValue([]),
  salesChannelDistribution: vi.fn().mockResolvedValue([]),
  productDemand: vi.fn().mockResolvedValue([]),
});

describe("OperationalService average sales per transaction", () => {
  it("uses total filtered Net Sales divided by filtered transactions", async () => {
    const service = new OperationalService(
      createRepository({
        _sum: { netSales: 1_250 },
        _avg: { guestCount: 2 },
        _count: { id: 4 },
      }) as never,
    );

    await expect(service.getAnalytics({})).resolves.toMatchObject({
      summary: {
        totalTransactions: 4,
        averageSalesPerTransaction: 312.5,
        averageRevenuePerTransaction: 312.5,
      },
    });
  });

  it("returns zero when the filtered transaction count is zero", async () => {
    const service = new OperationalService(
      createRepository({
        _sum: { netSales: null },
        _avg: { guestCount: null },
        _count: { id: 0 },
      }) as never,
    );

    await expect(service.getAnalytics({})).resolves.toMatchObject({
      summary: {
        totalTransactions: 0,
        averageSalesPerTransaction: 0,
      },
    });
  });

  it("consolidates payment aliases, preserves all amounts, and ranks categories by amount", async () => {
    const service = new OperationalService(
      createRepository(
        {
          _sum: { netSales: 1_205 },
          _avg: { guestCount: 2 },
          _count: { id: 7 },
        },
        [
          { paymentMethod: " Cash ", transactionId: "cash-1", _sum: { amount: 400 } },
          { paymentMethod: "Card", transactionId: "card-1", _sum: { amount: 100 } },
          { paymentMethod: "credit   card", transactionId: "card-2", _sum: { amount: 200 } },
          { paymentMethod: "DEBIT CARD", transactionId: "card-3", _sum: { amount: 300 } },
          { paymentMethod: "E-Wallet", transactionId: "wallet-1", _sum: { amount: 50 } },
          { paymentMethod: "GCash", transactionId: "wallet-2", _sum: { amount: 60 } },
          { paymentMethod: "maya", transactionId: "wallet-3", _sum: { amount: 70 } },
          { paymentMethod: "Bank Transfer", transactionId: "other-1", _sum: { amount: 25 } },
        ],
      ) as never,
    );

    await expect(service.getAnalytics({})).resolves.toMatchObject({
      paymentMethodDistribution: [
        { paymentMethod: "Credit/Debit Card", revenue: 600 },
        { paymentMethod: "Cash", revenue: 400 },
        { paymentMethod: "E-Wallet", revenue: 180 },
        { paymentMethod: "Other payment methods", revenue: 25 },
      ],
      paymentMethodSummary: { totalRevenue: 1_205 },
    });
  });
});
