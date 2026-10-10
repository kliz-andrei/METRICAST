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

type UnknownRecord = Record<string, unknown>;

const record = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;

const finiteNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const requiredFiniteNumber = (value: unknown, field: string) => {
  if (value === null || value === undefined || value === "") {
    throw new Error(`Operational analytics returned an invalid ${field} value.`);
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Operational analytics returned an invalid ${field} value.`);
  }
  return number;
};

const array = <T>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);

/**
 * Keeps an incomplete or temporarily stale operations response localized to
 * this feature.  The backend's legacy averageRevenuePerTransaction field is
 * mathematically equivalent to Net Sales ÷ completed transactions and is only
 * used while a response lacks the new explicit field.
 */
export function normalizeOperationalAnalyticsResponse(
  value: unknown,
): OperationalAnalyticsResponse {
  const response = record(value);
  const rawSummary = record(response?.summary);
  if (!response || !rawSummary) {
    throw new Error("Operational analytics returned an incomplete response.");
  }

  const legacyAverage = requiredFiniteNumber(
    rawSummary.averageRevenuePerTransaction,
    "averageRevenuePerTransaction",
  );
  const hasExplicitAverage = Object.hasOwn(rawSummary, "averageSalesPerTransaction");
  const averageSalesPerTransaction = hasExplicitAverage
    ? requiredFiniteNumber(
      rawSummary.averageSalesPerTransaction,
      "averageSalesPerTransaction",
    )
    : (() => {
      console.warn(
        "[operations] Using the legacy averageRevenuePerTransaction field while the explicit averageSalesPerTransaction field is unavailable.",
      );
      return legacyAverage;
    })();

  return {
    ...response,
    summary: {
      ...rawSummary,
      totalTransactions: finiteNumber(rawSummary.totalTransactions),
      totalOrders: finiteNumber(rawSummary.totalOrders),
      averageSalesPerTransaction,
      dineInShare: rawSummary.dineInShare === null ? null : finiteNumber(rawSummary.dineInShare),
      takeOutShare: rawSummary.takeOutShare === null ? null : finiteNumber(rawSummary.takeOutShare),
      deliveryShare: rawSummary.deliveryShare === null ? null : finiteNumber(rawSummary.deliveryShare),
      averageGuestsPerTransaction: finiteNumber(rawSummary.averageGuestsPerTransaction),
      averageRevenuePerTransaction: legacyAverage,
      peakOperatingHour: typeof rawSummary.peakOperatingHour === "string" ? rawSummary.peakOperatingHour : null,
      peakOperatingDay: typeof rawSummary.peakOperatingDay === "string" ? rawSummary.peakOperatingDay : null,
      averageDailyTransactions: finiteNumber(rawSummary.averageDailyTransactions),
    },
    hourlyOperations: array<OperationalHour>(response.hourlyOperations),
    dailyOperations: array<OperationalDay>(response.dailyOperations),
    averageSalesPerTransactionTrend: array<OperationalAnalyticsResponse["averageSalesPerTransactionTrend"][number]>(response.averageSalesPerTransactionTrend),
    hourlyTransactionDistribution: array<OperationalAnalyticsResponse["hourlyTransactionDistribution"][number]>(response.hourlyTransactionDistribution),
    dailyTransactionDistribution: array<OperationalAnalyticsResponse["dailyTransactionDistribution"][number]>(response.dailyTransactionDistribution),
    hourlyRevenue: array<OperationalAnalyticsResponse["hourlyRevenue"][number]>(response.hourlyRevenue),
    paymentMethodDistribution: array<OperationalAnalyticsResponse["paymentMethodDistribution"][number]>(response.paymentMethodDistribution),
    orderTypeDistribution: array<OperationalAnalyticsResponse["orderTypeDistribution"][number]>(response.orderTypeDistribution),
    salesChannelDistribution: array<OperationalAnalyticsResponse["salesChannelDistribution"][number]>(response.salesChannelDistribution),
    busiestHours: array<OperationalHour>(response.busiestHours),
    slowestHours: array<OperationalHour>(response.slowestHours),
    busiestDays: array<OperationalDay>(response.busiestDays),
    slowestDays: array<OperationalDay>(response.slowestDays),
    paymentMethodSummary: {
      paymentMethods: finiteNumber(record(response.paymentMethodSummary)?.paymentMethods),
      totalPaymentTransactions: finiteNumber(record(response.paymentMethodSummary)?.totalPaymentTransactions),
      totalRevenue: finiteNumber(record(response.paymentMethodSummary)?.totalRevenue),
    },
    productDemand: array<OperationalAnalyticsResponse["productDemand"][number]>(response.productDemand),
    insights: array<OperationalAnalyticsResponse["insights"][number]>(response.insights),
  };
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
    normalizeOperationalAnalyticsResponse(
      (
        await api.get<unknown>("/analytics/operations", {
        params: queryParameters(filters),
        })
      ).data,
    ),
};
