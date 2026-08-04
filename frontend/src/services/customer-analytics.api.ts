import { api } from './api-client';
import type { SalesFilters } from './sales-analytics.api';

export interface CustomerAnalyticsSummary {
  totalGuestsServed: number;
  averageGuestsPerTransaction: number;
  averageSpendPerGuest: number;
  averageTransactionsPerDay: number;
  peakDiningHour: string | null;
  peakDiningDay: string | null;
}

export interface GuestPeriod {
  date?: string;
  month?: string;
  guests: number;
  transactions: number;
}

export interface GuestDistribution {
  guestCount: number;
  transactions: number;
}

export interface DiningHour {
  hour: number;
  guests: number;
  transactions: number;
}

export interface CustomerAnalyticsResponse {
  summary: CustomerAnalyticsSummary;
  guestsPerDay: GuestPeriod[];
  guestsPerMonth: GuestPeriod[];
  guestDistribution: GuestDistribution[];
  diningHourHeatmap: DiningHour[];
  orderTypeDistribution: Array<{ orderType: string; guests: number; transactions: number }>;
  salesChannelDistribution: Array<{ salesChannel: string; guests: number; transactions: number }>;
  highestGuestDays: Array<Required<Pick<GuestPeriod, 'date'>> & Omit<GuestPeriod, 'date'>>;
  lowestGuestDays: Array<Required<Pick<GuestPeriod, 'date'>> & Omit<GuestPeriod, 'date'>>;
  peakDiningHours: DiningHour[];
  slowDiningHours: DiningHour[];
}

const queryParameters = (filters: SalesFilters) =>
  Object.fromEntries(Object.entries(filters).filter(([, value]) => value));

export const customerAnalyticsApi = {
  get: async (filters: SalesFilters): Promise<CustomerAnalyticsResponse> =>
    (await api.get<CustomerAnalyticsResponse>('/analytics/customer', { params: queryParameters(filters) })).data
};
