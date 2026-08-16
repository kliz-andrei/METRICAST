import { ProductAnalyticsRepository, type ProductAnalyticsFilters } from '../repositories/product-analytics.repository.js';

export interface ProductAnalyticsQuery {
  startDate?: string;
  endDate?: string;
  salesChannel?: string;
  salesChannels?: string[];
  orderType?: string;
}

interface ProductPerformance {
  productName: string;
  category: string;
  quantitySold: number;
  revenue: number;
}

const numberValue = (value: unknown): number => Number(value ?? 0);

const parseStartDate = (value?: string): Date | undefined => value ? new Date(`${value}T00:00:00+08:00`) : undefined;
const parseEndDate = (value?: string): Date | undefined => value ? new Date(`${value}T23:59:59.999+08:00`) : undefined;

export class ProductAnalyticsService {
  constructor(private readonly repository = new ProductAnalyticsRepository()) {}

  async getAnalytics(query: ProductAnalyticsQuery) {
    const filters: ProductAnalyticsFilters = {
      startDate: parseStartDate(query.startDate),
      endDate: parseEndDate(query.endDate),
      salesChannel: query.salesChannel || undefined,
      salesChannels: query.salesChannels?.length ? query.salesChannels : undefined,
      orderType: query.orderType || undefined
    };
    const [summary, productMetrics, productRevenueTrend] = await Promise.all([
      this.repository.summary(filters),
      this.repository.productMetrics(filters),
      this.repository.dailyRevenue(filters)
    ]);
    const productsById = new Map((await this.repository.productDetails(productMetrics.map((metric) => metric.productId))).map((product) => [product.id, product]));
    const productPerformance: ProductPerformance[] = productMetrics.map((metric) => {
      const product = productsById.get(metric.productId);
      if (!product) throw new Error(`Product ${metric.productId} referenced by a transaction item does not exist.`);

      return {
        productName: product.name,
        category: product.category.name,
        quantitySold: numberValue(metric._sum.quantity),
        revenue: numberValue(metric._sum.salesAmount)
      };
    });
    const categories = new Map<string, { category: string; quantitySold: number; revenue: number }>();

    for (const product of productPerformance) {
      const current = categories.get(product.category) ?? { category: product.category, quantitySold: 0, revenue: 0 };
      current.quantitySold += product.quantitySold;
      current.revenue += product.revenue;
      categories.set(product.category, current);
    }

    const totalRevenue = numberValue(summary._sum.salesAmount);
    const uniqueProductsSold = productPerformance.length;

    return {
      summary: {
        totalProductsSold: numberValue(summary._sum.quantity),
        uniqueProductsSold,
        totalRevenue,
        averageRevenuePerProduct: uniqueProductsSold === 0 ? 0 : totalRevenue / uniqueProductsSold
      },
      topProducts: [...productPerformance].sort((left, right) => right.revenue - left.revenue).slice(0, 10),
      topCategories: [...categories.values()].sort((left, right) => right.revenue - left.revenue),
      lowestSellingProducts: [...productPerformance].sort((left, right) => left.quantitySold - right.quantitySold).slice(0, 10),
      productRevenueTrend: productRevenueTrend.map((row) => ({ date: row.date, revenue: numberValue(row.revenue) }))
    };
  }
}
