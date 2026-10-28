import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api-client';

export type SatisfactionTrendGranularity = 'daily' | 'weekly' | 'monthly';
export type SatisfactionTrend = { date: string; overall: number; food: number; service: number; responses: number };
export type SatisfactionDimension = 'overall' | 'food' | 'service';
export type SatisfactionCategory = { key: SatisfactionDimension; average: number | null; validResponses: number; distribution: Array<{ rating: number; responses: number; percent: number }> };
export type CustomerSatisfaction = {
  summary: {
    totalResponses: number;
    dateRange: { start: string; end: string };
  };
  categories: SatisfactionCategory[];
  highestRatedCategory: SatisfactionDimension | null;
  lowestRatedCategory: SatisfactionDimension | null;
  trendGranularity: SatisfactionTrendGranularity;
  trend: SatisfactionTrend[];
};

export const useCustomerSatisfaction = (startDate?: string, endDate?: string) =>
  useQuery({
    queryKey: ['customer-satisfaction', startDate, endDate],
    queryFn: async () =>
      (await api.get<{ data: CustomerSatisfaction | null }>('/analytics/satisfaction', { params: { startDate, endDate } })).data.data,
  });
