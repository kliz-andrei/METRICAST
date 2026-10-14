import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api-client';

export type SatisfactionTrendGranularity = 'daily' | 'weekly' | 'monthly';
export type SatisfactionTrend = { date: string; overall: number; food: number; service: number; responses: number };
export type CustomerSatisfaction = {
  summary: {
    totalResponses: number;
    averageOverallSatisfaction: number;
    averageFoodSatisfaction: number;
    averageServiceSatisfaction: number;
    satisfied: { count: number; percent: number };
    neutral: { count: number; percent: number };
    dissatisfied: { count: number; percent: number };
    dateRange: { start: string; end: string };
  };
  distribution: Array<{ rating: number; responses: number; percent: number }>;
  trendGranularity: SatisfactionTrendGranularity;
  trend: SatisfactionTrend[];
};

export const useCustomerSatisfaction = (startDate?: string, endDate?: string) =>
  useQuery({
    queryKey: ['customer-satisfaction', startDate, endDate],
    queryFn: async () =>
      (await api.get<{ data: CustomerSatisfaction | null }>('/analytics/satisfaction', { params: { startDate, endDate } })).data.data,
  });
