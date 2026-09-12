import { api } from "./api-client";
import type { SalesFilters } from "./sales-analytics.api";

export interface OperationalSummary {
  totalTransactions: number;
  totalOrders: number;
  averageSalesPerTransaction: number;
  dineInShare: number | null;
  takeOutShare: number | null;
  deliveryShare: number | null;
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
  averageSalesPerTransactionTrend: Array<{
    date: string;
    transactionCount: number;
    totalSales: number;
    averageSalesPerTransaction: number;
  }>;
  hourlyTransactionDistribution: Array<
    Pick<OperationalHour, "hour" | "transactionCount">
  >;
  dailyTransactionDistribution: Array<
    Pick<OperationalDay, "date" | "transactionCount">
  >;
  hourlyRevenue: Array<Pick<OperationalHour, "hour" | "revenue">>;
  paymentMethodDistribution: Array<
    OperationalDistribution & { paymentMethod: string }
  >;
  orderTypeDistribution: Array<OperationalDistribution & { orderType: string }>;
  salesChannelDistribution: Array<
    OperationalDistribution & { salesChannel: string }
  >;
  busiestHours: OperationalHour[];
  slowestHours: OperationalHour[];
  busiestDays: OperationalDay[];
  slowestDays: OperationalDay[];
  paymentMethodSummary: {
    paymentMethods: number;
    totalPaymentTransactions: number;
    totalRevenue: number;
  };
  productDemand: Array<{
    productId: string;
    productName: string;
    category: string;
    quantitySold: number;
  }>;
  insights: Array<{
    key: string;
    title: string;
    message: string;
  }>;
}

const queryParameters = (filters: SalesFilters) =>
  Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => value)
      .map(([key, value]) => [
        key,
        key === "salesChannels" && Array.isArray(value)
          ? value.join(",")
          : value,
      ]),
  );

export const operationalAnalyticsApi = {
  get: async (filters: SalesFilters): Promise<OperationalAnalyticsResponse> =>
    (
      await api.get<OperationalAnalyticsResponse>("/analytics/operations", {
        params: queryParameters(filters),
      })
    ).data,
};
