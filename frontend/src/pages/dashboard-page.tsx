import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Inbox } from "lucide-react";
import { BadgePercent, CalendarDays, Clock3, Package, ReceiptText, ShoppingBag, TrendingDown, TrendingUp, UserRound, Users } from "lucide-react";
import { Link } from "react-router-dom";
import {
  EmptyState,
  ErrorState,
  ChartSkeleton,
  LoadingSkeleton,
} from "../components/ui/states";
import { useSalesSummary } from "../hooks/use-sales-analytics";
import { useForecastValidation } from "../hooks/useForecasting";
import { ForecastValidationChart } from "../components/forecasting/validation-chart";
import { salesAnalyticsApi } from "../services/sales-analytics.api";
import {
  useHourlySales,
  useDailySales,
  useDiscountDistribution,
  useMonthlySales,
  useOrderTypeSales,
  useDayOfWeekAnalysis,
} from "../hooks/use-sales-analytics";
import { dashboardApi } from "../services/dashboard.api";
import {
  DashboardDateRangeControl,
} from "../components/dashboard-date-range-control";
import { DashboardSalesChannelFilter } from "../components/dashboard-sales-channel-filter";
import { operatingHoursForRange } from "../utils/operating-hours";
import { useSalesFilters } from "../contexts/sales-filters-context";

const money = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
const chartColors = {
  primary: "#047857",
  primaryMuted: "#6b9b8b",
  gold: "#d4a72c",
  goldMuted: "#e8c56a",
  orange: "#d97706",
  purpleMuted: "#7c6fa8",
  neutral: "#64748b",
} as const;
const chartCardClass =
  "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900";
const chartAxisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fill: "currentColor", fontSize: 12 },
} as const;
const currencyAxis = (value: number) => {
  const amount = Number(value);
  if (Math.abs(amount) >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `₱${Math.round(amount / 1_000)}K`;
  return `₱${Math.round(amount)}`;
};
const salesTrendDate = (value: string | number) => {
  const date = new Date(`${String(value)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};
const salesTrendTicks = (dates: string[], startDate?: string, endDate?: string) => {
  const visibleDates = [...new Set(dates)]
    .filter((date) => (!startDate || date >= startDate) && (!endDate || date <= endDate))
    .sort((left, right) => left.localeCompare(right));
  if (!visibleDates.length) return [];

  const first = startDate && visibleDates.includes(startDate) ? startDate : visibleDates[0];
  const last = endDate && visibleDates.includes(endDate) ? endDate : visibleDates.at(-1)!;
  const firstIndex = visibleDates.indexOf(first);
  const lastIndex = visibleDates.indexOf(last);
  const rangeDates = visibleDates.slice(firstIndex, lastIndex + 1);
  const tickCount = Math.min(rangeDates.length, 5);
  if (tickCount <= 1) return rangeDates;

  return Array.from({ length: tickCount }, (_, index) =>
    rangeDates[Math.round((index * (rangeDates.length - 1)) / (tickCount - 1))],
  );
};
const salesTrendRangeLabel = (
  range: { startDate?: string; endDate?: string },
  rows: Array<{ date: string }>,
) => {
  const start = range.startDate ?? rows[0]?.date;
  const end = range.endDate ?? rows.at(-1)?.date;
  if (!start || !end) return "No selected dates";
  return `${salesTrendDate(start)} – ${salesTrendDate(end)}`;
};
type SalesTrendInsight =
  | { available: false; message: string }
  | {
    available: true;
    direction: "increasing" | "decreasing" | "stable";
    peak: { date: string; sales: number };
    lowest: { date: string; sales: number };
    variability: "Relatively stable" | "Moderately variable" | "Highly variable" | "Unavailable";
    variabilityMessage: string;
  };

const salesTrendInterpretation = (rows: Array<{ date: string; sales: number }>): SalesTrendInsight => {
  const values = rows
    .filter((row) => Number.isFinite(row.sales))
    .sort((left, right) => left.date.localeCompare(right.date));
  if (!values.length) {
    return { available: false, message: "No daily Net Sales are available for the selected period, so a sales trend cannot be assessed." };
  }
  if (values.length === 1) {
    return { available: false, message: `Only one daily Net Sales observation is available (${salesTrendDate(values[0].date)} at ${money(values[0].sales)}), so a sales trend and variability cannot be assessed.` };
  }

  const mean = values.reduce((total, row) => total + row.sales, 0) / values.length;
  const variance = values.reduce((total, row) => total + (row.sales - mean) ** 2, 0) / values.length;
  const coefficientOfVariation = mean === 0 ? null : Math.sqrt(variance) / Math.abs(mean);
  const midpoint = (values.length - 1) / 2;
  const denominator = values.reduce((total, _, index) => total + (index - midpoint) ** 2, 0);
  const slope = denominator === 0
    ? 0
    : values.reduce((total, row, index) => total + (index - midpoint) * (row.sales - mean), 0) / denominator;
  // A fitted movement of more than 8% of mean daily sales across the period is treated as directional.
  const relativeTrend = mean === 0 ? 0 : (slope * (values.length - 1)) / Math.abs(mean);
  const direction = relativeTrend > 0.08 ? "increasing" : relativeTrend < -0.08 ? "decreasing" : "stable";
  const peak = values.reduce((current, row) => row.sales > current.sales ? row : current);
  const lowest = values.reduce((current, row) => row.sales < current.sales ? row : current);
  // Coefficient of variation: <=8% stable, 8–20% moderate, and >=20% highly variable.
  const variability = coefficientOfVariation === null
    ? "Unavailable"
    : coefficientOfVariation >= 0.2
      ? "Highly variable"
      : coefficientOfVariation <= 0.08
        ? "Relatively stable"
        : "Moderately variable";
  const variabilityMessage = coefficientOfVariation === null
    ? "Daily sales variability could not be assessed because the average daily sales amount is zero."
    : `Daily Net Sales were ${variability.toLowerCase()} across the selected period.`;

  return { available: true, direction, peak, lowest, variability, variabilityMessage };
};
type SalesChannelInsight =
  | { available: false; message: string }
  | {
    available: true;
    highest: { channel: string; sales: number };
    lowest: { channel: string; sales: number };
    share: number | null;
  };

const salesChannelInterpretation = (rows: Array<{ channel: string; sales: number }>): SalesChannelInsight => {
  const channels = rows
    .filter((row) => row.channel && Number.isFinite(row.sales))
    .sort((left, right) => right.sales - left.sales);
  if (!channels.length) return { available: false, message: "No sales channel data is available for the selected period." };

  const total = channels.reduce((sum, row) => sum + row.sales, 0);
  return {
    available: true,
    highest: channels[0],
    lowest: channels.at(-1)!,
    share: total > 0 ? (channels[0].sales / total) * 100 : null,
  };
};
const salesTrendYAxisDomain = (values: number[]): [number, number] => {
  const finiteValues = values.filter(Number.isFinite);
  if (!finiteValues.length) return [0, 1];

  const minimum = Math.min(...finiteValues);
  const maximum = Math.max(...finiteValues);
  const padding = Math.max((maximum - minimum) * 0.1, Math.abs(maximum) * 0.03, 1);
  const paddedMinimum = minimum - padding;
  const paddedMaximum = maximum + padding;
  const targetTickSize = Math.max((paddedMaximum - paddedMinimum) / 5, 1);
  const magnitude = 10 ** Math.floor(Math.log10(targetTickSize));
  const normalized = targetTickSize / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;

  return [
    Math.floor(paddedMinimum / step) * step,
    Math.ceil(paddedMaximum / step) * step,
  ];
};
const previousPeriod = (range: { startDate?: string; endDate?: string }) => { if (!range.startDate || !range.endDate) return undefined; const start = new Date(`${range.startDate}T00:00:00Z`); const end = new Date(`${range.endDate}T00:00:00Z`); const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1; const previousEnd = new Date(start); previousEnd.setUTCDate(previousEnd.getUTCDate() - 1); const previousStart = new Date(previousEnd); previousStart.setUTCDate(previousStart.getUTCDate() - days + 1); return { startDate: previousStart.toISOString().slice(0, 10), endDate: previousEnd.toISOString().slice(0, 10) }; };
const percentChange = (current: number, previous: number) =>
  Number.isFinite(current) && Number.isFinite(previous) && previous !== 0
    ? ((current - previous) / Math.abs(previous)) * 100
    : undefined;

function MetricTooltip({
  active,
  payload,
  title,
  metricLabel,
  valueKey,
  total,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown> }>;
  title: string;
  metricLabel: string;
  valueKey: string;
  total?: number;
}) {
  const row = payload?.[0]?.payload;
  const value = Number(row?.[valueKey]);

  if (!active || !row || !Number.isFinite(value)) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        {metricLabel}: <span className="font-medium tabular-nums">{money(value)}</span>
      </p>
      {total !== undefined && total > 0 && (
        <p className="text-slate-500 dark:text-slate-400">
          Contribution: <span className="font-medium tabular-nums">{((value / total) * 100).toFixed(1)}%</span>
        </p>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { filters: globalFilters, setFilters: setGlobalFilters } = useSalesFilters();
  const range = { startDate: globalFilters.startDate, endDate: globalFilters.endDate };
  const [dateRangeOpenSignal, setDateRangeOpenSignal] = useState(0);
  const [salesChannels, setSalesChannels] = useState<string[]>([]);
  const filters = { ...range, salesChannels };
  const summary = useQuery({
    queryKey: ["dashboard", "summary", filters],
    queryFn: () => dashboardApi.summary(filters),
    staleTime: 60_000, refetchOnWindowFocus: false, placeholderData: keepPreviousData,
  });
  const trend = useQuery({
    queryKey: ["dashboard", "trend", filters],
    queryFn: () => dashboardApi.trend(filters),
    staleTime: 60_000, refetchOnWindowFocus: false, placeholderData: keepPreviousData,
  });
  const channels = useQuery({
    queryKey: ["dashboard", "channels", filters],
    queryFn: () => dashboardApi.channels(filters),
    staleTime: 60_000, refetchOnWindowFocus: false, placeholderData: keepPreviousData,
  });
  const products = useQuery({
    queryKey: ["dashboard", "products", filters],
    queryFn: () => dashboardApi.products(filters),
    staleTime: 60_000, refetchOnWindowFocus: false, placeholderData: keepPreviousData,
  });
  const channelOptions = useQuery({
    queryKey: ["dashboard", "channel-options", range],
    queryFn: () => dashboardApi.channels(range),
    staleTime: 60_000, refetchOnWindowFocus: false, placeholderData: keepPreviousData,
  });
  const sales = useSalesSummary(filters);
  const priorRange = previousPeriod(range);
  const previousSales = useQuery({ queryKey: ["dashboard", "previous-sales", priorRange, salesChannels], queryFn: () => dashboardApi.summary({ ...priorRange, salesChannels }), enabled: Boolean(priorRange), staleTime: 60_000, refetchOnWindowFocus: false });
  const previousKpis = useQuery({ queryKey: ["dashboard", "previous-kpis", priorRange, salesChannels], queryFn: () => salesAnalyticsApi.summary({ ...priorRange, salesChannels }), enabled: Boolean(priorRange), staleTime: 60_000, refetchOnWindowFocus: false });
  const monthlySales = useMonthlySales(filters);
  const hourlySales = useHourlySales(filters);
  const dailySales = useDailySales(filters);
  // The operating schedule belongs to the restaurant, not a sales channel.
  // Keep this scope unfiltered by channel for the All-range denominator.
  const operatingDayScope = useDailySales(range);
  const orderTypes = useOrderTypeSales(filters);
  const discounts = useDiscountDistribution(filters);
  const weekdays = useDayOfWeekAnalysis(filters);
  // Forecast validation is date-based. Sales-channel filtering is not part of
  // the SARIMA input model, so it is intentionally not represented here.
  const forecastValidation = useForecastValidation(range);
  const salesTrendData = trend.data ?? [];
  const salesTrendChartData = [
    ...salesTrendData,
    ...[range.startDate, range.endDate]
      .filter((date): date is string => Boolean(date) && !salesTrendData.some((item) => item.date === date))
      .map((date) => ({ date, sales: null })),
  ].sort((left, right) => left.date.localeCompare(right.date));
  const salesTrendAxisTicks = salesTrendTicks(salesTrendChartData.map((item) => item.date), range.startDate, range.endDate);
  const salesTrendLabel = salesTrendRangeLabel(range, salesTrendData);
  const salesTrendInsight = salesTrendInterpretation(salesTrendData);
  const salesChannelInsight = salesChannelInterpretation(channels.data ?? []);
  const [weekdayMetric, setWeekdayMetric] = useState<"averageSalesPerOccurrence" | "totalSales" | "transactions" | "guests" | "averageOrderValue">("averageSalesPerOccurrence");
  const dashboardHeader = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <p className="text-sm font-medium leading-none text-amber-700 dark:text-amber-300">
          Under the Balete
        </p>
        <h2 className="text-3xl font-bold leading-tight">Dashboard</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Business performance overview showcasing sales trends, customer insights, and operational efficiency.
        </p>
      </div>
      <div className="sticky top-16 z-10 w-full self-end rounded-xl border border-slate-200/80 bg-[#f5f7fa]/95 p-1 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:w-auto sm:shrink-0">
        <DashboardDateRangeControl
          applied={range}
          onApply={({ startDate, endDate }) => setGlobalFilters((current) => ({ ...current, startDate, endDate }))}
          openSignal={dateRangeOpenSignal}
        />
      </div>
    </div>
  );

  if (summary.isLoading || sales.isLoading)
    return (
      <section className="space-y-6">
        {dashboardHeader}
        <div aria-busy="true" aria-label="Loading dashboard data" className="grid gap-6 xl:grid-cols-2">
          <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <article key={index} className="rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><LoadingSkeleton className="h-4 w-28" /><LoadingSkeleton className="mt-4 h-8 w-36" /></article>)}</div>
          <ChartSkeleton height="h-80" label="Loading sales trend" />
          <ChartSkeleton height="h-80" label="Loading sales channels" />
        </div>
      </section>
    );
  if (summary.isError || sales.isError)
    return (
      <section className="space-y-6">
        {dashboardHeader}
        <article className="rounded-2xl border bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <ErrorState message="Unable to load dashboard data." />
        </article>
      </section>
    );
  if (!summary.data?.totalTransactions)
    return (
      <section className="space-y-6">
        {dashboardHeader}
        <article className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <Inbox className="size-10 text-emerald-800 dark:text-amber-300" />
          <h3 className="mt-4 text-lg font-semibold">No data available</h3>
          <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            No imported POS data is available for the selected date range{salesChannels.length ? ' and sales channel filter' : ''}.
          </p>
          <button
            type="button"
            onClick={() => setDateRangeOpenSignal((signal) => signal + 1)}
            className="mt-5 rounded-md bg-emerald-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            Change Date Range
          </button>
          {salesChannels.length > 0 && <button type="button" onClick={() => setSalesChannels([])} className="mt-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:hover:bg-slate-800">Clear Channel Filter</button>}
        </article>
      </section>
    );
  const totalSales = summary.data.totalSales;
  const netSales = summary.data.netSales;
  // Product-revenue contribution has historically been calculated against net sales.
  const total = netSales;
  const guestsServed = Math.round(summary.data.averageGuests * summary.data.totalTransactions);
  const previousGuestsServed = previousSales.data
    ? Math.round(previousSales.data.averageGuests * previousSales.data.totalTransactions)
    : undefined;
  const revenuePerGuest = guestsServed ? (sales.data?.netSales ?? netSales) / guestsServed : undefined;
  const previousRevenuePerGuest = previousGuestsServed
    ? (previousKpis.data?.netSales ?? previousSales.data?.netSales ?? 0) / previousGuestsServed
    : undefined;
  const activeDays = dailySales.data?.length ?? 0;
  const selectedCalendarDays = range.startDate && range.endDate ? Math.round((new Date(`${range.endDate}T00:00:00Z`).getTime() - new Date(`${range.startDate}T00:00:00Z`).getTime()) / 86_400_000) + 1 : activeDays;
  const previousDays = priorRange ? Math.round((new Date(`${priorRange.endDate}T00:00:00Z`).getTime() - new Date(`${priorRange.startDate}T00:00:00Z`).getTime()) / 86_400_000) + 1 : 0;
  const operatingHours = operatingHoursForRange(range, operatingDayScope.data ?? []);
  const previousOperatingHours = priorRange
    ? operatingHoursForRange(priorRange)
    : undefined;
  const comparison = (current: number, previous: number | undefined) => previous === undefined ? undefined : percentChange(current, previous);
  const cards: Array<{ label: string; value: string; icon: typeof ReceiptText; comparison?: number }> = [
    {
      label: "Total Sales",
      value: money(totalSales),
      icon: ReceiptText,
      comparison: comparison(totalSales, previousSales.data?.totalSales),
    },
    {
      label: "Net Sales",
      value: money(netSales),
      icon: TrendingUp,
      comparison: comparison(netSales, previousSales.data?.netSales),
    },
    {
      label: "Average Daily Sales",
      value: selectedCalendarDays ? money((sales.data?.netSales ?? netSales) / selectedCalendarDays) : "—",
      icon: CalendarDays,
      comparison: comparison((sales.data?.netSales ?? netSales) / (selectedCalendarDays || 1), previousKpis.data ? previousKpis.data.netSales / (previousDays || 1) : undefined),
    },
    {
      label: "Average Sales per Hour",
      value: operatingHours
        ? money((sales.data?.netSales ?? netSales) / operatingHours)
        : "—",
      icon: Clock3,
      comparison:
        operatingHours && previousOperatingHours
          ? comparison(
              (sales.data?.netSales ?? netSales) / operatingHours,
              previousKpis.data
                ? previousKpis.data.netSales / previousOperatingHours
                : undefined,
            )
          : undefined,
    },
    {
      label: "Guests Served",
      value: guestsServed.toLocaleString(),
      icon: Users,
      comparison: comparison(guestsServed, previousGuestsServed),
    },
    {
      label: "Revenue per Guest",
      value: revenuePerGuest === undefined ? "—" : money(revenuePerGuest),
      icon: UserRound,
      comparison: revenuePerGuest === undefined ? undefined : comparison(revenuePerGuest, previousRevenuePerGuest),
    },
  ];
  const chartCard = (
    title: string,
    subtitle: string,
    state: {
      isLoading: boolean;
      isError: boolean;
      data?: Array<{ date?: string; hour?: string; sales: number }>;
    },
    xKey: "date" | "hour",
    variant: "monthly" | "hourly",
  ) => {
    const data = [...(state.data ?? [])].sort((left, right) =>
      xKey === "date"
        ? String(left.date).localeCompare(String(right.date))
        : Number(left.hour) - Number(right.hour),
    );
    const maximum = Math.max(...data.map((item) => item.sales), 0);
    const totalSales = data.reduce((sum, item) => sum + item.sales, 0);
    const Icon = variant === "monthly" ? CalendarDays : Clock3;

    return (
      <article className={chartCardClass}>
        <div className="mb-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Icon className={`size-4 ${variant === "monthly" ? "text-amber-600 dark:text-amber-300" : "text-emerald-800 dark:text-emerald-300"}`} />
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        {state.isLoading ? (
          <div className="h-72 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        ) : state.isError ? (
          <ErrorState message="Unable to load sales data." />
        ) : !data.length ? (
          <EmptyState title="No sales data available for the selected period." />
        ) : (
          <div className="h-72 text-slate-500 dark:text-slate-400">
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.14} />
                <XAxis
                  {...chartAxisProps}
                  dataKey={xKey}
                  minTickGap={20}
                  tickFormatter={
                    xKey === "hour"
                      ? (value) => `${Number(value) % 12 || 12} ${Number(value) >= 12 ? "PM" : "AM"}`
                      : (value) => new Intl.DateTimeFormat("en", { month: "short", year: new Set(data.map((item) => String(item.date).slice(0, 4))).size > 1 ? "numeric" : undefined }).format(new Date(`${value}-01T00:00:00Z`))
                  }
                />
                <YAxis {...chartAxisProps} width={58} tickFormatter={currencyAxis} />
                <Tooltip
                  cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
                  content={({ active, payload, label }) => (
                    <MetricTooltip
                      active={active}
                      payload={payload}
                      title={
                        variant === "monthly" && label
                          ? new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(`${label}-01T00:00:00Z`))
                          : label !== undefined
                            ? `${Number(label) % 12 || 12}:00 ${Number(label) >= 12 ? "PM" : "AM"}`
                            : title
                      }
                      metricLabel="Sales"
                      valueKey="sales"
                      total={variant === "hourly" ? totalSales : undefined}
                    />
                  )}
                />
                <Bar dataKey="sales" radius={[6, 6, 0, 0]} activeBar={{ fill: variant === "monthly" ? chartColors.orange : chartColors.primary }} animationDuration={350}>
                  {data.map((item) => {
                    const highest = item.sales === maximum;
                    const fill = variant === "monthly"
                      ? (highest ? chartColors.gold : chartColors.goldMuted)
                      : (highest ? chartColors.primary : item.sales / maximum >= 0.55 ? "#23816d" : chartColors.primaryMuted);
                    return <Cell key={`${xKey}-${item[xKey]}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>
    );
  };
  const orderTypeData = [...(orderTypes.data ?? [])].sort(
    (left, right) => right.netSales - left.netSales,
  );
  const orderTypeTotal = orderTypeData.reduce(
    (sum, item) => sum + item.netSales,
    0,
  );
  const discountData = [...(discounts.data?.data ?? [])].sort(
    (left, right) => right.discountAmount - left.discountAmount,
  );
  const discountTotal = discounts.data?.totalDiscountAmount ?? 0;
  return (
    <section className="space-y-6">
      {dashboardHeader}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, comparison: change }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:border-emerald-800/30 dark:border-slate-700 dark:bg-slate-900 motion-reduce:transition-none"
          >
            <div className="flex items-center justify-between gap-3"><p className="text-sm text-slate-600 dark:text-slate-400">{label}</p><Icon className="size-4 text-emerald-800 dark:text-amber-300" /></div>
            <p className="mt-3 text-2xl font-bold">{value}</p>
            {change !== undefined && <p className={`mt-1 text-xs font-medium ${change >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>{change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% vs previous period</p>}
          </article>
        ))}
      </div>
      <KeyInsights summary={summary.data} dailySales={dailySales.data ?? []} hourlySales={hourlySales.data ?? []} products={products.data ?? []} channels={channels.data ?? []} />
      <div className="grid items-stretch gap-6 xl:grid-cols-3">
        <article className={`${chartCardClass} flex h-full flex-col xl:col-span-2`}>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <h3 className="flex items-center gap-2 font-semibold"><TrendingUp className="size-4 text-emerald-800 dark:text-emerald-300" />Sales trend</h3>
            <span className="text-sm text-slate-500 dark:text-slate-400">{salesTrendLabel}</span>
          </div>
          <div className="min-h-64 flex-1 text-slate-500 dark:text-slate-400">
            <ResponsiveContainer>
              <LineChart data={salesTrendChartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.14} />
                <XAxis
                  {...chartAxisProps}
                  dataKey="date"
                  ticks={salesTrendAxisTicks}
                  interval={0}
                  padding={{ left: 12, right: 12 }}
                  tickFormatter={salesTrendDate}
                />
                <YAxis
                  {...chartAxisProps}
                  domain={salesTrendYAxisDomain(salesTrendData.flatMap((item) => Number.isFinite(item.sales) ? [item.sales] : []))}
                  width={58}
                  tickFormatter={currencyAxis}
                />
                <Tooltip cursor={{ stroke: chartColors.neutral, strokeOpacity: 0.3 }} content={({ active, payload, label }) => <MetricTooltip active={active} payload={payload} title={salesTrendDate(label ?? "")} metricLabel="Sales" valueKey="sales" />} />
                <Line
                  dataKey="sales"
                  stroke={chartColors.primary}
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 border-t border-slate-200/80 pt-3 dark:border-slate-800">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Sales Trend Interpretation</h4>
            {!salesTrendInsight.available ? (
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{salesTrendInsight.message}</p>
            ) : (
              <p className="mt-2 max-w-5xl text-sm leading-7 text-slate-600 dark:text-slate-400">
                Daily Net Sales{" "}
                <span className="font-medium text-emerald-800 dark:text-emerald-300">
                  {salesTrendInsight.direction === "increasing" ? "generally increased" : salesTrendInsight.direction === "decreasing" ? "generally decreased" : "remained relatively stable"}
                </span>{" "}
                across the selected period. The highest daily result was{" "}
                <span className="font-medium text-slate-800 dark:text-slate-200">{salesTrendDate(salesTrendInsight.peak.date)} at {money(salesTrendInsight.peak.sales)}</span>,{" "}
                while the lowest was{" "}
                <span className="font-medium text-slate-800 dark:text-slate-200">{salesTrendDate(salesTrendInsight.lowest.date)} at {money(salesTrendInsight.lowest.sales)}</span>.{" "}
                <span className="text-slate-500 dark:text-slate-400">{salesTrendInsight.variabilityMessage}</span>
              </p>
            )}
          </div>
        </article>
        <article className={`${chartCardClass} flex h-full flex-col`}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="font-semibold">Sales channel</h3>
            <DashboardSalesChannelFilter channels={(channelOptions.data ?? []).map((item) => item.channel).sort((left, right) => left.localeCompare(right))} value={salesChannels} onApply={setSalesChannels} />
          </div>
          <div className="min-h-64 flex-1 text-slate-500 dark:text-slate-400">
            <ResponsiveContainer>
              <BarChart layout="vertical" data={[...(channels.data ?? [])].sort((left, right) => right.sales - left.sales)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.14} />
                <XAxis
                  {...chartAxisProps}
                  type="number"
                  tickFormatter={currencyAxis}
                />
                <YAxis {...chartAxisProps} type="category" dataKey="channel" width={80} />
                <Tooltip content={({ active, payload }) => { const row = payload?.[0]?.payload as { channel: string; sales: number } | undefined; if (!active || !row) return null; const totalSales = (channels.data ?? []).reduce((total, item) => total + item.sales, 0); const share = totalSales ? (row.sales / totalSales) * 100 : 0; return <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md dark:border-slate-700 dark:bg-slate-900"><p className="font-semibold">{row.channel}</p><p>Sales: {money(row.sales)}</p><p>Contribution: {share.toFixed(1)}%</p></div>; }} />
                <Bar dataKey="sales" fill={chartColors.primary} radius={[0, 4, 4, 0]} activeBar={{ fill: chartColors.accent }} animationDuration={350} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 border-t border-slate-200/80 pt-3 dark:border-slate-800">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Sales Channel Interpretation</h4>
            {!salesChannelInsight.available ? (
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{salesChannelInsight.message}</p>
            ) : salesChannelInsight.highest.channel === salesChannelInsight.lowest.channel ? (
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400"><span className="font-medium text-emerald-800 dark:text-emerald-300">{salesChannelInsight.highest.channel}</span> was the only displayed sales channel, generating <span className="font-medium text-slate-800 dark:text-slate-200">{money(salesChannelInsight.highest.sales)}</span> during the selected period.</p>
            ) : (
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">
                <span className="font-medium text-emerald-800 dark:text-emerald-300">{salesChannelInsight.highest.channel}</span> led with <span className="font-medium text-slate-800 dark:text-slate-200">{money(salesChannelInsight.highest.sales)}</span>{salesChannelInsight.share === null ? null : <> (<span className="font-medium text-slate-800 dark:text-slate-200">{salesChannelInsight.share.toFixed(1)}%</span> of channel sales)</>}, while <span className="font-medium text-slate-800 dark:text-slate-200">{salesChannelInsight.lowest.channel}</span> recorded the lowest sales at <span className="font-medium text-slate-800 dark:text-slate-200">{money(salesChannelInsight.lowest.sales)}</span>.
              </p>
            )}
          </div>
        </article>
      </div>
      <ForecastValidationChart
        data={forecastValidation.data}
        isLoading={forecastValidation.isLoading}
        isError={forecastValidation.isError}
      />
      <section className={chartCardClass} aria-label="Day of Week Analysis">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="flex items-center gap-2 font-semibold"><CalendarDays className="size-4 text-emerald-800 dark:text-amber-300" aria-hidden="true" />Day of Week Analysis</h3><p className="mt-1 text-sm text-slate-500">Compare sales performance across Monday–Sunday using average-per-occurrence metrics.</p></div><select aria-label="Day of week metric" value={weekdayMetric} onChange={(event) => setWeekdayMetric(event.target.value as typeof weekdayMetric)} className="rounded-md border bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="averageSalesPerOccurrence">Average Sales</option><option value="totalSales">Total Sales</option><option value="transactions">Transactions</option><option value="guests">Guests</option><option value="averageOrderValue">Average Order Value</option></select></div>
        {weekdays.isLoading ? <div className="mt-4 h-64 animate-pulse rounded bg-slate-200 dark:bg-slate-800" /> : weekdays.isError ? <ErrorState message="Unable to load weekday analysis." /> : !(weekdays.data ?? []).length ? <EmptyState title="No sales data available for the selected period." /> : <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]"><div className="h-72 text-slate-500 dark:text-slate-400"><ResponsiveContainer><BarChart data={weekdays.data}><XAxis dataKey="day" /><YAxis tickFormatter={(value) => weekdayMetric === 'transactions' || weekdayMetric === 'guests' ? Number(value).toLocaleString() : `₱${Math.round(Number(value) / 1000)}K`} /><Tooltip formatter={(value) => weekdayMetric === 'transactions' || weekdayMetric === 'guests' ? Number(value).toLocaleString() : money(Number(value))} /><Bar dataKey={weekdayMetric} radius={[5,5,0,0]}>{weekdays.data.map((row) => <Cell key={row.day} fill={row.averageSalesPerOccurrence === Math.max(...weekdays.data.map((item) => item.averageSalesPerOccurrence ?? -1)) ? chartColors.gold : chartColors.primary} />)}</Bar></BarChart></ResponsiveContainer></div><div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">{[['Best Average Sales Day',[...weekdays.data].sort((a,b)=>(b.averageSalesPerOccurrence??-1)-(a.averageSalesPerOccurrence??-1))[0], 'averageSalesPerOccurrence'],['Highest Guest-Volume Day',[...weekdays.data].sort((a,b)=>b.guests-a.guests)[0], 'guests'],['Highest Transaction-Volume Day',[...weekdays.data].sort((a,b)=>b.transactions-a.transactions)[0], 'transactions']].map(([label,row,key]) => <Link key={String(label)} to={`/sales?dayOfWeek=${(row as {weekday:number}).weekday}`} className="rounded-xl border p-3 transition hover:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700"><p className="text-xs text-slate-500">{String(label)}</p><p className="mt-1 font-semibold">{(row as {day:string}).day}</p><p className="text-sm">{key === 'averageSalesPerOccurrence' ? money((row as {averageSalesPerOccurrence:number|null}).averageSalesPerOccurrence ?? 0) : Number((row as Record<string, unknown>)[String(key)]).toLocaleString()}</p></Link>)}</div></div>}
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        {chartCard(
          "Monthly Sales",
          "Sales performance by month",
          monthlySales,
          "date",
          "monthly",
        )}
        {chartCard(
          "Sales by Hour",
          "Sales distribution across operating hours",
          hourlySales,
          "hour",
          "hourly",
        )}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <article className={chartCardClass}>
          <h3 className="flex items-center gap-2 font-semibold"><ShoppingBag className="size-4 text-violet-700 dark:text-violet-300" />Order Type</h3>
          <p className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sales performance by order type
          </p>
          {orderTypes.isLoading ? (
            <div className="h-72 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          ) : orderTypes.isError ? (
            <ErrorState message="Unable to load order type data." />
          ) : !orderTypeData.length ? (
            <EmptyState title="No order type data available for the selected period." />
          ) : (
            <div className="h-72 text-slate-500 dark:text-slate-400">
              <ResponsiveContainer>
                <BarChart data={orderTypeData} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.14} />
                  <XAxis
                    {...chartAxisProps}
                    type="number"
                    tickFormatter={currencyAxis}
                  />
                  <YAxis
                    {...chartAxisProps}
                    type="category"
                    dataKey="orderType"
                    width={100}
                  />
                  <Tooltip
                    cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
                    content={({ active, payload }) => <MetricTooltip active={active} payload={payload} title={String(payload?.[0]?.payload?.orderType ?? "Order Type")} metricLabel="Sales" valueKey="netSales" total={orderTypeTotal} />}
                  />
                  <Bar dataKey="netSales" radius={[0, 6, 6, 0]} activeBar={{ fill: chartColors.primary }} animationDuration={350}>
                    {orderTypeData.map((item, index) => <Cell key={item.orderType} fill={index === 0 ? chartColors.primary : chartColors.purpleMuted} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
        <article className={chartCardClass}>
          <h3 className="flex items-center gap-2 font-semibold"><BadgePercent className="size-4 text-amber-600 dark:text-amber-300" />Discount Distribution</h3>
          <p className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
            Discounts applied during the selected period
          </p>
          {discounts.isLoading ? (
            <div className="h-72 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          ) : discounts.isError ? (
            <ErrorState message="Unable to load discount distribution." />
          ) : !discountData.length ? (
            <EmptyState title="No discounts recorded for the selected period." />
          ) : (
            <div className="h-72 text-slate-500 dark:text-slate-400">
              <ResponsiveContainer>
                <BarChart data={discountData} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.14} />
                  <XAxis
                    {...chartAxisProps}
                    type="number"
                    tickFormatter={currencyAxis}
                  />
                  <YAxis
                    {...chartAxisProps}
                    type="category"
                    dataKey="discountType"
                    width={110}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      const row = payload?.[0]?.payload as
                        | {
                            discountType: string;
                            discountAmount: number;
                            transactionCount: number;
                          }
                        | undefined;
                      if (!active || !row) return null;

                      return <MetricTooltip active={active} payload={payload} title={row.discountType} metricLabel="Discount" valueKey="discountAmount" total={discountTotal} />;
                    }}
                  />
                  <Bar dataKey="discountAmount" radius={[0, 6, 6, 0]} activeBar={{ fill: chartColors.orange }} animationDuration={350}>
                    {discountData.map((item, index) => <Cell key={item.discountType} fill={index === 0 ? chartColors.orange : chartColors.goldMuted} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <SalesDayRanking title="Top Sales Days" rows={dailySales.data} loading={dailySales.isLoading} error={dailySales.isError} lowest={false} />
        <SalesDayRanking title="Lowest Sales Days" rows={dailySales.data} loading={dailySales.isLoading} error={dailySales.isError} lowest />
      </div>
      <article className="overflow-x-auto rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex justify-between">
          <h3 className="flex items-center gap-2 font-semibold"><Package className="size-4 text-emerald-800 dark:text-amber-300" />Top products</h3>
          <Link
            to="/products"
            className="text-sm text-emerald-800 dark:text-amber-300"
          >
            View All
          </Link>
        </div>
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70">
            <tr>
              <th className="px-3 py-3 text-left">Rank</th><th className="px-3 py-3 text-left">Product</th><th className="px-3 py-3 text-left">Category</th><th className="px-3 py-3 text-right">Quantity</th><th className="px-3 py-3 text-right">Revenue</th><th className="px-3 py-3 text-right">Contribution</th>
            </tr>
          </thead>
          <tbody>
            {(products.data ?? []).map((product, index) => (
              <tr key={product.productId} className="border-t transition-colors duration-200 hover:bg-emerald-50/60 dark:border-slate-800 dark:hover:bg-slate-800/70 motion-reduce:transition-none">
                <td className="px-3 py-3"><span className={`inline-grid size-6 place-items-center rounded-full text-xs font-semibold ${index === 0 ? 'bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{index + 1}</span></td><td className="px-3 py-3 font-medium">{product.productName}</td><td className="px-3 py-3 text-slate-500">{product.category}</td><td className="px-3 py-3 text-right tabular-nums">{product.quantitySold}</td><td className="px-3 py-3 text-right"><p className="tabular-nums">{money(product.revenue)}</p><div className="ml-auto mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-700 transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${((product.revenue / ((products.data?.[0]?.revenue) || 1)) * 100).toFixed(1)}%` }} /></div></td><td className="px-3 py-3 text-right"><p className="tabular-nums">{total ? `${((product.revenue / total) * 100).toFixed(1)}%` : "—"}</p><div className="ml-auto mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-amber-400" style={{ width: `${total ? (product.revenue / total) * 100 : 0}%` }} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}

function SalesDayRanking({ title, rows, loading, error, lowest }: { title: string; rows: Array<{ date?: string; sales: number }> | undefined; loading: boolean; error: boolean; lowest: boolean }) {
  const ranking = [...(rows ?? [])].sort((left, right) => lowest ? left.sales - right.sales : right.sales - left.sales).slice(0, 5); const max = ranking[0]?.sales || 1; const Icon = lowest ? TrendingDown : TrendingUp;
  return <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h3 className="mb-4 flex items-center gap-2 font-semibold"><Icon className={`size-4 ${lowest ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-800 dark:text-emerald-300'}`} />{title}</h3>{loading ? <div className="h-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" /> : error ? <ErrorState message="Unable to load sales-day data." /> : !ranking.length ? <EmptyState title="No sales-day data available for the selected period." /> : <div className="space-y-1">{ranking.map((row, index) => <div key={row.date} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-200 hover:bg-emerald-50/60 dark:hover:bg-slate-800/70 motion-reduce:transition-none"><span className={`grid size-6 place-items-center rounded-full text-xs font-semibold ${index === 0 ? 'bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{index + 1}</span><div><p className="text-sm">{row.date ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${row.date}T00:00:00Z`)) : "—"}</p><div className="mt-1 h-1.5 max-w-40 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${lowest ? 'bg-amber-400' : 'bg-emerald-700'}`} style={{ width: `${(row.sales / max) * 100}%` }} /></div></div><p className="text-right text-sm font-medium tabular-nums">{money(row.sales)}</p></div>)}</div>}</article>;
}

function KeyInsights({ summary, dailySales, hourlySales, products, channels }: { summary: { totalTransactions: number; averageGuests: number } | undefined; dailySales: Array<{ date?: string; sales: number }>; hourlySales: Array<{ hour?: string; sales: number }>; products: Array<{ productName: string; revenue: number }>; channels: Array<{ channel: string; sales: number }> }) {
  const insights: Array<{ title: string; text: string; icon: typeof TrendingUp }> = [];
  const days = dailySales.filter((row): row is { date: string; sales: number } => Boolean(row.date) && Number.isFinite(row.sales));
  const totalDailySales = days.reduce((total, row) => total + row.sales, 0);
  const typicalDailySales = days.length ? totalDailySales / days.length : 0;
  if (days.length >= 2 && typicalDailySales > 0) {
    const variance = days.reduce((total, row) => total + (row.sales - typicalDailySales) ** 2, 0) / days.length;
    const coefficientOfVariation = Math.sqrt(variance) / typicalDailySales;
    const pattern = coefficientOfVariation >= 0.2 ? "fluctuated substantially" : coefficientOfVariation <= 0.08 ? "remained relatively stable" : "showed moderate day-to-day variation";
    insights.push({ title: 'Sales Pattern', text: `Daily Net Sales ${pattern} across the selected period.`, icon: TrendingUp });
  }
  const peakDay = [...days].sort((a, b) => b.sales - a.sales)[0];
  if (peakDay?.date && typicalDailySales > 0) {
    const date = new Date(`${peakDay.date}T00:00:00Z`);
    const weekday = new Intl.DateTimeFormat('en', { weekday: 'long', timeZone: 'UTC' }).format(date);
    const aboveTypical = ((peakDay.sales / typicalDailySales) - 1) * 100;
    insights.push({ title: 'Peak Sales Day', text: `${weekday}, ${salesTrendDate(peakDay.date)} reached ${money(peakDay.sales)}, ${aboveTypical > 0 ? `${aboveTypical.toFixed(0)}% above` : 'at'} the typical daily level.`, icon: CalendarDays });
  }
  if (summary && summary.totalTransactions > 0 && totalDailySales > 0) {
    const averageTransaction = totalDailySales / summary.totalTransactions;
    insights.push({ title: 'Customer Spending Pattern', text: `Transactions averaged ${money(averageTransaction)} with a typical party size of ${summary.averageGuests.toFixed(1)} guests.`, icon: Users });
  }
  const rankedProducts = [...products].filter((product) => Number.isFinite(product.revenue)).sort((left, right) => right.revenue - left.revenue);
  const topProduct = rankedProducts[0]; const nextProduct = rankedProducts[1];
  if (topProduct) {
    const text = nextProduct?.revenue > 0
      ? `${topProduct.productName} led the displayed products, generating ${((topProduct.revenue / nextProduct.revenue - 1) * 100).toFixed(0)}% more revenue than the next-ranked product.`
      : `${topProduct.productName} was the highest-ranked displayed product.`;
    insights.push({ title: 'Top Product', text, icon: ShoppingBag });
  }
  const rankedChannels = [...channels].filter((channel) => Number.isFinite(channel.sales)).sort((left, right) => right.sales - left.sales);
  const topChannel = rankedChannels[0]; const channelTotal = rankedChannels.reduce((total, channel) => total + channel.sales, 0);
  if (topChannel && channelTotal > 0) {
    const share = (topChannel.sales / channelTotal) * 100;
    insights.push({ title: 'Sales Channel Mix', text: `${topChannel.channel} represented ${share.toFixed(1)}% of channel sales; all other channels contributed ${(100 - share).toFixed(1)}%.`, icon: TrendingUp });
  }
  const recordedHours = hourlySales.filter((row): row is { hour: string; sales: number } => row.hour !== undefined && Number.isFinite(row.sales));
  const peakHour = [...recordedHours].sort((a,b)=>b.sales-a.sales)[0];
  const typicalHourSales = recordedHours.length ? recordedHours.reduce((total, row) => total + row.sales, 0) / recordedHours.length : 0;
  if (peakHour && typicalHourSales > 0) {
    const hour = Number(peakHour.hour); const label=(value:number)=>`${value % 12 || 12} ${value >= 12 ? 'PM' : 'AM'}`;
    const aboveTypical = ((peakHour.sales / typicalHourSales) - 1) * 100;
    insights.push({ title: 'Peak Dining Hour', text: `${label(hour)}–${label((hour + 1) % 24)} was the highest-sales hour, ${aboveTypical > 0 ? `${aboveTypical.toFixed(0)}% above` : 'at'} the typical recorded hour.`, icon: Clock3 });
  }
  if (!insights.length) return null;
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900"><h3 className="font-semibold">Business Insights</h3><p className="mt-1 text-sm text-slate-500">Automatically calculated from the selected POS data.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{insights.map((insight) => { const Icon = insight.icon; return <div key={insight.title} className="rounded-xl bg-slate-50 p-4 transition duration-200 motion-reduce:transition-none dark:bg-slate-800/70"><div className="flex items-center gap-2 text-emerald-800 dark:text-amber-300"><Icon className="size-4" /><p className="font-medium">{insight.title}</p></div><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{insight.text}</p></div>; })}</div></article>;
}
