import { api } from './api-client';
import type { SalesFilters } from './sales-analytics.api';

export interface ProductAnalyticsSummary {
  totalProductsSold: number;
  uniqueProductsSold: number;
  totalRevenue: number;
  averageRevenuePerProduct: number;
}

export interface ProductPerformance {
  productName: string;
  category: string;
  quantitySold: number;
  revenue: number;
}

export interface CategoryPerformance {
  category: string;
  quantitySold: number;
  revenue: number;
}

export interface ProductRevenueTrend {
  date: string;
  revenue: number;
}

export interface ProductAnalyticsResponse {
  summary: ProductAnalyticsSummary;
  topProducts: ProductPerformance[];
  topCategories: CategoryPerformance[];
  lowestSellingProducts: ProductPerformance[];
  productRevenueTrend: ProductRevenueTrend[];
}

const queryParameters = (filters: SalesFilters) =>
  Object.fromEntries(Object.entries(filters).filter(([, value]) => value));

export const productAnalyticsApi = {
  get: async (filters: SalesFilters): Promise<ProductAnalyticsResponse> =>
    (await api.get<ProductAnalyticsResponse>('/analytics/products', { params: queryParameters(filters) })).data
};
