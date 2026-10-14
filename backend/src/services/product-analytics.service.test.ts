import { describe, expect, it, vi } from "vitest";
import { ProductAnalyticsService } from "./product-analytics.service.js";

describe("ProductAnalyticsService top-product revenue trend", () => {
  it("ranks products by revenue with a stable tie-breaker and returns only their daily revenue", async () => {
    const dailyRevenueByProduct = vi.fn().mockResolvedValue([
      { date: "2026-08-01", productId: "product-1", revenue: 250 },
      { date: "2026-08-01", productId: "product-2", revenue: 500 },
    ]);
    const repository = {
      summary: vi.fn().mockResolvedValue({
        _sum: { quantity: 12, salesAmount: 1_100 },
      }),
      productMetrics: vi.fn().mockResolvedValue([
        { productId: "product-2", _sum: { quantity: 5, salesAmount: 500 } },
        { productId: "product-1", _sum: { quantity: 4, salesAmount: 500 } },
        { productId: "product-3", _sum: { quantity: 3, salesAmount: 100 } },
      ]),
      productDetails: vi.fn().mockResolvedValue([
        { id: "product-1", name: "Alpha", category: { name: "Entree" } },
        { id: "product-2", name: "Beta", category: { name: "Entree" } },
        { id: "product-3", name: "Gamma", category: { name: "Drinks" } },
      ]),
      dailyRevenue: vi.fn().mockResolvedValue([
        { date: "2026-08-01", revenue: 1_100 },
      ]),
      dailyRevenueByProduct,
    };
    const service = new ProductAnalyticsService(repository as never);

    const result = await service.getAnalytics({
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });

    expect(repository.dailyRevenueByProduct).toHaveBeenCalledWith(
      expect.anything(),
      ["product-1", "product-2", "product-3"],
    );
    expect(result.topProducts.map((product) => product.productName)).toEqual([
      "Alpha",
      "Beta",
      "Gamma",
    ]);
    expect(result.topProductRevenueTrend).toEqual([
      {
        date: "2026-08-01",
        productId: "product-1",
        productName: "Alpha",
        revenue: 250,
      },
      {
        date: "2026-08-01",
        productId: "product-2",
        productName: "Beta",
        revenue: 500,
      },
    ]);
  });
});
