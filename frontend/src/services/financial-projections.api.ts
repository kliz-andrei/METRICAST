import { api } from './api-client';

export type FinancialFilters = {
  startDate?: string;
  endDate?: string;
  salesChannel?: string;
  salesChannels?: string[];
  orderType?: string;
  horizon?: number;
};

export type CostCoverage = {
  soldProducts: number;
  configuredProducts: number;
  missingProducts: number;
  soldItems: number;
  configuredItems: number;
  missingItems: number;
  configuredQuantity: number;
  missingQuantity: number;
  configuredProductCost: number;
  productCoveragePercent: number;
  itemCoveragePercent: number;
};

export type FinancialStatus =
  | 'READY'
  | 'INCOMPLETE_COST_COVERAGE'
  | 'NO_COST_CONFIGURATION'
  | 'NO_HISTORICAL_SALES'
  | 'FORECAST_UNAVAILABLE'
  | 'INVALID_FORECAST_SALES';

export type FinancialSummary = {
  status: FinancialStatus;
  historicalNetSales: number;
  historicalEstimatedProductCost: number;
  historicalEstimatedCostRatio: number | null;
  overheadRate: number;
  costCoverage: CostCoverage;
  assumptions: {
    forecastModel: string;
    costBasis: string;
    costRelationship: string;
    operatingOverheadRate: number;
    projectionType: string;
  };
  forecast: {
    available: boolean;
    forecastedNetSales?: number;
    horizon?: number;
    forecastPeriod?: { start: string; end: string } | null;
  } | null;
  totals?: {
    historicalEstimatedCostRatio: number;
    estimatedProductCost: number;
    estimatedOperatingOverhead: number;
    estimatedTotalCost: number;
    estimatedProfit: number;
    estimatedProfitMargin: number;
  };
  projections: Array<{
    date: string;
    forecastedNetSales: number;
    historicalEstimatedCostRatio: number;
    estimatedProductCost: number;
    estimatedOperatingOverhead: number;
    estimatedTotalCost: number;
    estimatedProfit: number;
    estimatedProfitMargin: number;
  }>;
};

export type FinancialSettings = { id: string; overheadRate: number };
export type CostedProduct = {
  id: string;
  name: string;
  sku: string | null;
  unitCost: number | null;
  category: { name: string };
};

const params = (filters: FinancialFilters) => ({
  ...filters,
  salesChannels: filters.salesChannels?.join(','),
});

export const financialProjectionsApi = {
  summary: (filters: FinancialFilters) =>
    api.get<FinancialSummary>('/financial-projections/summary', { params: params(filters) }).then((response) => response.data),
  coverage: (filters: FinancialFilters = {}) =>
    api.get<Pick<FinancialSummary, 'status' | 'historicalNetSales' | 'historicalEstimatedProductCost' | 'historicalEstimatedCostRatio' | 'costCoverage'>>('/financial-projections/coverage', { params: params(filters) }).then((response) => response.data),
  settings: () => api.get<FinancialSettings>('/financial-projections/settings').then((response) => response.data),
  updateSettings: (overheadRate: number) => api.put<FinancialSettings>('/financial-projections/settings', { overheadRate }).then((response) => response.data),
  products: () => api.get<{ products: CostedProduct[] }>('/financial-projections/products').then((response) => response.data),
  updateProductCost: (id: string, unitCost: number | null) => api.patch<CostedProduct>(`/financial-projections/products/${id}`, { unitCost }).then((response) => response.data),
};
