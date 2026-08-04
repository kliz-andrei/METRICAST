import { useQuery } from '@tanstack/react-query';
import { operationalAnalyticsApi } from '../services/operational-analytics.api';
import type { SalesFilters } from '../services/sales-analytics.api';

export const operationalAnalyticsKeys = {
  all: ['operational-analytics'] as const,
  detail: (filters: SalesFilters) => [...operationalAnalyticsKeys.all, filters] as const
};

export const useOperationalAnalytics = (filters: SalesFilters = {}) =>
  useQuery({
    queryKey: operationalAnalyticsKeys.detail(filters),
    queryFn: () => operationalAnalyticsApi.get(filters),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });
