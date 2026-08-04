import { api } from './api-client';
import type { SalesFilters } from './sales-analytics.api';

export interface OperationalSummary {
  totalTransactions: number;
  averageGuestsPerTransaction: number;
  averageRevenuePerTransaction: number;
  peakOperatingHour: string | null;
  peakOperatingDay: string | null;
  averageDailyTransactions: number;
}

export interface OperationalHour {
  hour: number;
  transactionCount: number;
  revenue: number;
  guestCount: number;
}

export interface OperationalDay {
  date: string;
  transactionCount: number;
  revenue: number;
  guestCount: number;
}

export interface OperationalDistribution {
  transactionCount: number;
  revenue: number;
}

export interface OperationalAnalyticsResponse {
  summary: OperationalSummary;
  hourlyOperations: OperationalHour[];
  dailyOperations: OperationalDay[];
  hourlyTransactionDistribution: Array<Pick<OperationalHour, 'hour' | 'transactionCount'>>;
  dailyTransactionDistribution: Array<Pick<OperationalDay, 'date' | 'transactionCount'>>;
  hourlyRevenue: Array<Pick<OperationalHour, 'hour' | 'revenue'>>;
  paymentMethodDistribution: Array<OperationalDistribution & { paymentMethod: string }>;
  orderTypeDistribution: Array<OperationalDistribution & { orderType: string }>;
  salesChannelDistribution: Array<OperationalDistribution & { salesChannel: string }>;
  busiestHours: OperationalHour[];
  slowestHours: OperationalHour[];
  busiestDays: OperationalDay[];
  slowestDays: OperationalDay[];
  paymentMethodSummary: {
    paymentMethods: number;
    totalPaymentTransactions: number;
    totalRevenue: number;
  };
}

const queryParameters = (filters: SalesFilters) =>
  Object.fromEntries(Object.entries(filters).filter(([, value]) => value));

export const operationalAnalyticsApi = {
  get: async (filters: SalesFilters): Promise<OperationalAnalyticsResponse> =>
    (await api.get<OperationalAnalyticsResponse>('/analytics/operations', { params: queryParameters(filters) })).data
};
