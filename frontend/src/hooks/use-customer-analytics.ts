import { useQuery } from '@tanstack/react-query';
import { customerAnalyticsApi } from '../services/customer-analytics.api';
import type { SalesFilters } from '../services/sales-analytics.api';

export const customerAnalyticsKeys = {
  all: ['customer-analytics'] as const,
  detail: (filters: SalesFilters) => [...customerAnalyticsKeys.all, filters] as const
};

export const useCustomerAnalytics = (filters: SalesFilters = {}) =>
  useQuery({
    queryKey: customerAnalyticsKeys.detail(filters),
    queryFn: () => customerAnalyticsApi.get(filters),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });
