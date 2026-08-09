import { useQuery } from '@tanstack/react-query';
import { salesAnalyticsApi, type SalesFilters } from '../services/sales-analytics.api';

const options = { staleTime: 60_000, refetchOnWindowFocus: false };
export const salesAnalyticsKeys = {
  all: ['sales-analytics'] as const,
  summary: (filters: SalesFilters) => [...salesAnalyticsKeys.all, 'summary', filters] as const,
  dayOfWeek: (filters: SalesFilters) => [...salesAnalyticsKeys.all, 'day-of-week', filters] as const,
  daily: (filters: SalesFilters) => [...salesAnalyticsKeys.all, 'daily', filters] as const,
  monthly: (filters: SalesFilters) => [...salesAnalyticsKeys.all, 'monthly', filters] as const,
  hourly: (filters: SalesFilters) => [...salesAnalyticsKeys.all, 'hourly', filters] as const,
  channel: (filters: SalesFilters) => [...salesAnalyticsKeys.all, 'channel', filters] as const,
  orderType: (filters: SalesFilters) => [...salesAnalyticsKeys.all, 'order-type', filters] as const,
  discountDistribution: (filters: SalesFilters) => [...salesAnalyticsKeys.all, 'discount-distribution', filters] as const,
};
export const useSalesSummary = (filters: SalesFilters = {}) => useQuery({ ...options, queryKey: salesAnalyticsKeys.summary(filters), queryFn: () => salesAnalyticsApi.summary(filters) });
export const useDayOfWeekAnalysis = (filters: SalesFilters = {}) => useQuery({ ...options, queryKey: salesAnalyticsKeys.dayOfWeek(filters), queryFn: () => salesAnalyticsApi.dayOfWeek(filters) });
export const useDailySales = (filters: SalesFilters = {}) => useQuery({ ...options, queryKey: salesAnalyticsKeys.daily(filters), queryFn: () => salesAnalyticsApi.daily(filters) });
export const useMonthlySales = (filters: SalesFilters = {}) => useQuery({ ...options, queryKey: salesAnalyticsKeys.monthly(filters), queryFn: () => salesAnalyticsApi.monthly(filters) });
export const useHourlySales = (filters: SalesFilters = {}) => useQuery({ ...options, queryKey: salesAnalyticsKeys.hourly(filters), queryFn: () => salesAnalyticsApi.hourly(filters) });
export const useChannelSales = (filters: SalesFilters = {}) => useQuery({ ...options, queryKey: salesAnalyticsKeys.channel(filters), queryFn: () => salesAnalyticsApi.channel(filters) });
export const useOrderTypeSales = (filters: SalesFilters = {}) => useQuery({ ...options, queryKey: salesAnalyticsKeys.orderType(filters), queryFn: () => salesAnalyticsApi.orderType(filters) });
export const useDiscountDistribution = (filters: SalesFilters = {}) => useQuery({ ...options, queryKey: salesAnalyticsKeys.discountDistribution(filters), queryFn: () => salesAnalyticsApi.discountDistribution(filters) });
