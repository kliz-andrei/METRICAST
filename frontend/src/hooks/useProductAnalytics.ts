import { useQuery } from '@tanstack/react-query';
import { productAnalyticsApi } from '../services/product-analytics.api';
import type { SalesFilters } from '../services/sales-analytics.api';

export const productAnalyticsKeys = {
  all: ['product-analytics'] as const,
  detail: (filters: SalesFilters) => [...productAnalyticsKeys.all, filters] as const
};

export const useProductAnalytics = (filters: SalesFilters = {}) =>
  useQuery({
    queryKey: productAnalyticsKeys.detail(filters),
    queryFn: () => productAnalyticsApi.get(filters),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });
