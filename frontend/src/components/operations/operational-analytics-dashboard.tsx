import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Clock3,
  CreditCard,
  ReceiptText,
  Package,
  ShoppingBag,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";
import { useSalesFilters } from "../../contexts/sales-filters-context";
import { useOperationalAnalytics } from "../../hooks/useOperationalAnalytics";
import { aggregateDatedSeries, formatTimePeriod, getTimeGranularity, getYAxisDomain } from "../../lib/chart-presentation";
import { percentChange, previousPeriod } from "../../lib/date-range";
import type { OperationalDistribution } from "../../services/operational-analytics.api";
import { ChartSkeleton, EmptyState, ErrorState, LoadingSkeleton } from "../ui/states";

const CHART_COLORS = [
  "#065f46",
  "#b7791f",
  "#059669",
  "#d97706",
  "#0f766e",
  "#ca8a04",
];
const FOREST_GREEN = "#065f46";
const GOLD = "#b7791f";
const PAYMENT_METHOD_COLORS: Record<string, string> = {
  Cash: "#065f46",
  "Credit/Debit Card": "#059669",
  "E-Wallet": "#b7791f",
  "Other payment methods": "#0f766e",
};

const paymentMethodColor = (paymentMethod: string) =>
  PAYMENT_METHOD_COLORS[paymentMethod] ?? "#64748b";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatExactCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-PH").format(value);

const formatHour = (hour: number) => {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const suffix = normalizedHour >= 12 ? "PM" : "AM";
  const displayHour = normalizedHour % 12 || 12;
  return `${displayHour} ${suffix}`;
};

const formatDateRange = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return "Selected period";

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Selected period";
  }

  const monthFormatter = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    timeZone: "UTC",
  });
  const yearFormatter = new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    timeZone: "UTC",
  });
  const dayFormatter = new Intl.DateTimeFormat("en-PH", {
    day: "2-digit",
    timeZone: "UTC",
  });
  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth();

  if (sameMonth) {
    return `${monthFormatter.format(start)} ${dayFormatter.format(start)}–${dayFormatter.format(end)}, ${yearFormatter.format(end)}`;
  }

  const fullDateFormatter = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${fullDateFormatter.format(start)} – ${fullDateFormatter.format(end)}`;
};

type CardProps = {
  title: ReactNode;
  children: ReactNode;
  className?: string;
};

function Card({ title, children, className = "" }: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 ${className}`}
    >
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      {children}
    </section>
  );
}

type ChartCardProps = CardProps & {
  description?: ReactNode;
  footer?: ReactNode;
};

function ChartCard({
  title,
  description,
  children,
  className,
  footer,
}: ChartCardProps) {
  return (
    <Card title={title} className={className}>
      {description ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      ) : null}
      <div className="mt-4 h-64 sm:h-72">{children}</div>
      {footer ? (
        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
      {message}
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  accent = "emerald",
}: {
  label: string;
  value: string;
  helper: ReactNode;
  icon: ReactNode;
  accent?: "emerald" | "gold" | "slate";
}) {
  const accents = {
    emerald:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    gold: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <Card title={label}>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            {value}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {helper}
          </p>
        </div>
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${accents[accent]}`}
        >
          {icon}
        </span>
      </div>
    </Card>
  );
}

function PreviousPeriodComparison({ change }: { change: number | undefined }) {
  const tone =
    change === undefined || change === 0
      ? "text-slate-500 dark:text-slate-400"
      : change > 0
        ? "text-emerald-700 dark:text-emerald-300"
        : "text-amber-700 dark:text-amber-300";
  const label =
    change === undefined
      ? "No previous-period comparison"
      : change === 0
        ? "0.0% vs previous period"
        : `${change > 0 ? "↑" : "↓"} ${Math.abs(change).toFixed(1)}% vs previous period`;

  return <span className={`font-medium ${tone}`}>{label}</span>;
}

type DisplayDistribution = OperationalDistribution & { label: string };

type TrendPoint = { date: string; value: number };

const trendExtremes = (points: TrendPoint[]) => {
  const valid = points
    .filter(
      (point) =>
        typeof point.date === "string" &&
        point.date.length > 0 &&
        Number.isFinite(point.value),
    )
    .sort((left, right) => left.date.localeCompare(right.date));
  if (!valid.length) return undefined;

  const highest = valid.reduce(
    (current, point) =>
      point.value > current.value ? point : current,
    valid[0],
  );
  const lowest = valid.reduce(
    (current, point) =>
      point.value < current.value ? point : current,
    valid[0],
  );
  return { highest, lowest, difference: highest.value - lowest.value, valid };
};

/** Uses the slope of the values plotted in the chart, not a separate series. */
const trendObservation = (points: TrendPoint[], subject: string) => {
  if (points.length < 3) return undefined;

  const meanX = (points.length - 1) / 2;
  const meanY = points.reduce((total, point) => total + point.value, 0) / points.length;
  const denominator = points.reduce(
    (total, _point, index) => total + (index - meanX) ** 2,
    0,
  );
  if (!Number.isFinite(meanY) || denominator === 0) return undefined;

  const slope =
    points.reduce(
      (total, point, index) => total + (index - meanX) * (point.value - meanY),
      0,
    ) / denominator;
  const estimatedChange = slope * (points.length - 1);
  const stabilityThreshold = Math.max(Math.abs(meanY) * 0.05, 1);

  if (Math.abs(estimatedChange) <= stabilityThreshold) {
    return `${subject} remained relatively stable across the selected period.`;
  }
  return `${subject} generally ${estimatedChange > 0 ? "increased" : "decreased"} across the selected period.`;
};

function DistributionChart({
  rows,
  emptyMessage,
  metric = "revenue",
  legendLayout = "grid",
}: {
  rows: DisplayDistribution[];
  emptyMessage: string;
  metric?: "revenue" | "transactionCount";
  legendLayout?: "grid" | "stack";
}) {
  const chartRows = rows.filter(
    (row) =>
      typeof row.label === "string" &&
      row.label.trim().length > 0 &&
      Number.isFinite(row[metric]) &&
      row[metric] > 0,
  );
  if (chartRows.length === 0) return <ChartEmptyState message={emptyMessage} />;

  const total = chartRows.reduce((sum, row) => sum + row[metric], 0);
  const formattedValue = (value: number) =>
    metric === "revenue" ? formatExactCurrency(value) : formatNumber(value);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartRows}
              dataKey={metric}
              nameKey="label"
              innerRadius="54%"
              outerRadius="82%"
              paddingAngle={3}
              stroke="none"
            >
              {chartRows.map((row, index) => (
                <Cell
                  key={`${row.label}-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, _name, item) => [
                formattedValue(Number(value)),
                `${item.payload.label} · ${
                  total > 0 ? ((Number(value) / total) * 100).toFixed(1) : "0.0"
                }%`,
              ]}
              contentStyle={{ borderRadius: "12px", borderColor: "#cbd5e1" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul
        className={
          legendLayout === "stack"
            ? "mt-1.5 space-y-1.5"
            : "mt-2 grid gap-x-3 gap-y-1 sm:grid-cols-2"
        }
        aria-label={`${metric === "revenue" ? "Revenue" : "Order"} distribution legend`}
      >
        {chartRows.map((row, index) => (
          <li
            key={`${row.label}-${index}`}
            className={`flex min-w-0 gap-1.5 text-xs text-slate-600 dark:text-slate-300 ${
              legendLayout === "stack" ? "items-start" : "items-center"
            }`}
          >
            <span
              className="mt-0.5 size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              aria-hidden="true"
            />
            <span
              className={`min-w-0 font-medium text-slate-700 dark:text-slate-200 ${
                legendLayout === "stack" ? "break-words" : "truncate"
              }`}
            >
              {row.label}
            </span>
            <span className="ml-auto shrink-0 whitespace-nowrap tabular-nums text-slate-500 dark:text-slate-400">
              {legendLayout === "stack"
                ? `${formattedValue(row[metric])} (${((row[metric] / total) * 100).toFixed(1)}%)`
                : `${formattedValue(row[metric])} · ${((row[metric] / total) * 100).toFixed(1)}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaymentSummary({ rows }: { rows: DisplayDistribution[] }) {
  return (
    <Card title="Payment Method Summary">
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No payment activity is available for the selected period.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="pb-3 font-medium">Payment method</th>
                <th className="pb-3 text-right font-medium">Transactions</th>
                <th className="pb-3 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className="text-slate-700 dark:text-slate-200"
                >
                  <td className="py-3 font-medium">{row.label}</td>
                  <td className="py-3 text-right">
                    {formatNumber(row.transactionCount)}
                  </td>
                  <td className="py-3 text-right">
                    {formatCurrency(row.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function OperationalSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <LoadingSkeleton key={index} className="h-36 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartSkeleton height="h-80" />
        <ChartSkeleton height="h-80" />
      </div>
    </div>
  );
}

export function OperationalAnalyticsDashboard() {
  const { filters } = useSalesFilters();
  const { data, isLoading, isError, error, refetch } =
    useOperationalAnalytics(filters);
  const priorRange = previousPeriod(filters);
  const previousQuery = useOperationalAnalytics(
    priorRange ? { ...filters, ...priorRange } : {},
    Boolean(priorRange),
  );

  if (isLoading) return <OperationalSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title="Unable to load operational analytics"
        message={error instanceof Error ? error.message : "Please try again."}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!data || data.summary.totalTransactions === 0) {
    return (
      <EmptyState
        title="No operational activity found"
        message="Try expanding the date range or clearing the selected filters."
      />
    );
  }

  const hourlyTransactionRows = data.hourlyTransactionDistribution
    .filter(
      (row) =>
        Number.isInteger(row.hour) &&
        row.hour >= 0 &&
        row.hour <= 23 &&
        Number.isFinite(row.transactionCount) &&
        row.transactionCount > 0,
    )
    .sort((left, right) => left.hour - right.hour);
  const peakTransactionHour = hourlyTransactionRows.reduce<
    (typeof hourlyTransactionRows)[number] | undefined
  >(
    (peak, row) =>
      !peak || row.transactionCount > peak.transactionCount ? row : peak,
    undefined,
  );
  const offPeakTransactionHour = hourlyTransactionRows.reduce<
    (typeof hourlyTransactionRows)[number] | undefined
  >(
    (quietest, row) =>
      !quietest || row.transactionCount < quietest.transactionCount
        ? row
        : quietest,
    undefined,
  );
  const transactionVolumeDifference =
    peakTransactionHour && offPeakTransactionHour
      ? peakTransactionHour.transactionCount - offPeakTransactionHour.transactionCount
      : 0;
  const orderTypeRows = data.orderTypeDistribution.map((row) => ({
    ...row,
    label: row.orderType,
  }));
  const salesChannelRows = data.salesChannelDistribution.map((row) => ({
    ...row,
    label: row.salesChannel,
  }));
  const paymentMethodRows = data.paymentMethodDistribution
    .map((row) => ({ ...row, label: row.paymentMethod }))
    .filter((row) => Number.isFinite(row.revenue))
    .sort(
      (left, right) =>
        right.revenue - left.revenue || left.label.localeCompare(right.label),
    );
  const productDemandRows = data.productDemand
    .filter(
      (row) =>
        typeof row.productName === "string" &&
        row.productName.trim().length > 0 &&
        Number.isFinite(row.quantitySold) &&
        row.quantitySold > 0,
    )
    .sort(
      (left, right) =>
        right.quantitySold - left.quantitySold ||
        left.productName.localeCompare(right.productName),
    )
    .slice(0, 10);
  // A vertical categorical axis renders the first datum at the top.
  const displayedProductDemand = productDemandRows;
  const averageSalesGranularity = getTimeGranularity(data.averageSalesPerTransactionTrend);
  const displayedAverageSalesTrend = aggregateDatedSeries(
    data.averageSalesPerTransactionTrend,
    ["transactionCount", "totalSales"],
    averageSalesGranularity,
  ).map((row) => ({
    ...row,
    averageSalesPerTransaction: row.transactionCount ? row.totalSales / row.transactionCount : 0,
  }));
  const orderVolumeGranularity = getTimeGranularity(data.dailyTransactionDistribution);
  const displayedOrderVolumeTrend = aggregateDatedSeries(
    data.dailyTransactionDistribution,
    ["transactionCount"],
    orderVolumeGranularity,
  );
  const averageSalesDomain = getYAxisDomain(displayedAverageSalesTrend.map((row) => row.averageSalesPerTransaction));
  const orderVolumeDomain = getYAxisDomain(displayedOrderVolumeTrend.map((row) => row.transactionCount));
  const averageSalesTrend = trendExtremes(
    displayedAverageSalesTrend.map((row) => ({
      date: row.date,
      value: row.averageSalesPerTransaction,
    })),
  );
  const orderVolumeTrend = trendExtremes(
    displayedOrderVolumeTrend.map((row) => ({
      date: row.date,
      value: row.transactionCount,
    })),
  );
  const averageSalesTrendObservation = averageSalesTrend
    ? trendObservation(
        averageSalesTrend.valid,
        "Average sales per transaction",
      )
    : undefined;
  const orderVolumeTrendObservation = orderVolumeTrend
    ? trendObservation(orderVolumeTrend.valid, "Order volume")
    : undefined;
  const validOrderTypeRows = orderTypeRows.filter(
    (row) => Number.isFinite(row.transactionCount) && row.transactionCount > 0,
  );
  const totalOrderTypeTransactions = validOrderTypeRows.reduce(
    (total, row) => total + row.transactionCount,
    0,
  );
  const leadingOrderType = [...validOrderTypeRows].sort(
    (left, right) =>
      right.transactionCount - left.transactionCount ||
      left.label.localeCompare(right.label),
  )[0];
  const validSalesChannelRows = salesChannelRows.filter(
    (row) => Number.isFinite(row.revenue) && row.revenue > 0,
  );
  const totalSalesChannelRevenue = validSalesChannelRows.reduce(
    (total, row) => total + row.revenue,
    0,
  );
  const leadingSalesChannel = [...validSalesChannelRows].sort(
    (left, right) =>
      right.revenue - left.revenue || left.label.localeCompare(right.label),
  )[0];
  const totalRecordedPaymentAmount = paymentMethodRows.reduce(
    (total, row) => total + row.revenue,
    0,
  );
  const leadingPaymentMethod = paymentMethodRows[0];
  const secondPaymentMethod = paymentMethodRows[1];
  const averageTransactionsPerHour = data.hourlyTransactionDistribution.length
    ? data.summary.totalOrders / data.hourlyTransactionDistribution.length
    : 0;
  const averageSalesPerTransaction = Number.isFinite(
    data.summary.averageSalesPerTransaction,
  )
    ? data.summary.averageSalesPerTransaction
    : 0;
  const previousData =
    previousQuery.isPlaceholderData || previousQuery.isError
      ? undefined
      : previousQuery.data;
  const previousAverageTransactionsPerHour =
    previousData && previousData.hourlyTransactionDistribution.length > 0
      ? previousData.summary.totalOrders /
        previousData.hourlyTransactionDistribution.length
      : undefined;
  const comparison = (current: number, previous: number | undefined) =>
    previous === undefined ? undefined : percentChange(current, previous);
  const selectedDateRange = formatDateRange(filters.startDate, filters.endDate);

  return (
    <div className="space-y-6">
      <section aria-label="Operational performance summary">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              Operational overview
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Activity indicators from recorded transactions, guests, and
              revenue for decision support. They do not measure staffing,
              service time, or table turnover.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Total Transactions"
            value={formatNumber(data.summary.totalOrders)}
            helper={
              <PreviousPeriodComparison
                change={comparison(
                  data.summary.totalOrders,
                  previousData?.summary.totalOrders,
                )}
              />
            }
            icon={<ReceiptText className="size-5" aria-hidden="true" />}
          />
          <MetricCard
            label="Avg. Transactions / Hour"
            value={averageTransactionsPerHour.toFixed(1)}
            helper={
              <PreviousPeriodComparison
                change={comparison(
                  averageTransactionsPerHour,
                  previousAverageTransactionsPerHour,
                )}
              />
            }
            icon={<TrendingUp className="size-5" aria-hidden="true" />}
            accent="gold"
          />
          <MetricCard
            label="Average Sales per Transaction"
            value={formatExactCurrency(averageSalesPerTransaction)}
            helper={
              <PreviousPeriodComparison
                change={comparison(
                  averageSalesPerTransaction,
                  previousData?.summary.averageSalesPerTransaction,
                )}
              />
            }
            icon={<WalletCards className="size-5" aria-hidden="true" />}
          />
        </div>
      </section>

      <section aria-label="Transaction volume by hour">
        <ChartCard
          title={
            <span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span>Transaction Volume by Hour</span>
              <span className="w-fit rounded-md bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {selectedDateRange}
              </span>
            </span>
          }
          description="Hourly transaction activity for the selected period. Peak and off-peak labels indicate recorded order volume, not staffing performance."
          footer={
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                Transaction Volume Interpretation
              </p>
              {peakTransactionHour && offPeakTransactionHour ? (
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Transaction activity peaked at{" "}
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatHour(peakTransactionHour.hour)}
                  </span>{" "}
                  with{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatNumber(peakTransactionHour.transactionCount)} transactions
                  </span>
                  , while{" "}
                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                    {formatHour(offPeakTransactionHour.hour)}
                  </span>{" "}
                  recorded the lowest activity with{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatNumber(offPeakTransactionHour.transactionCount)} transactions
                  </span>
                  —a difference of{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatNumber(transactionVolumeDifference)} transactions
                  </span>
                  .
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  No hourly transaction data is available for this period.
                </p>
              )}
            </div>
          }
        >
          {data.hourlyTransactionDistribution.length === 0 ? (
            <ChartEmptyState message="No hourly transaction data is available." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourlyTransactionDistribution} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="hour" tickFormatter={formatHour} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip labelFormatter={(value) => formatHour(Number(value))} formatter={(value: number) => [formatNumber(Number(value)), "Transactions"]} contentStyle={{ borderRadius: "12px", borderColor: "#cbd5e1" }} />
                <Bar dataKey="transactionCount" radius={[5, 5, 0, 0]}>
                  {data.hourlyTransactionDistribution.map((row) => <Cell key={row.hour} fill={row.hour === peakTransactionHour?.hour ? GOLD : "#059669"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      <section aria-labelledby="operations-insights-heading">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            Decision support
          </p>
          <h3
            id="operations-insights-heading"
            className="mt-1 text-lg font-semibold text-slate-950 dark:text-white"
          >
            Key Operational Insights
          </h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.insights.filter((insight) => insight.key !== "peak-hour").map((insight, index) => (
            <Card key={insight.key} title={insight.title}>
              <div className="mt-4 flex items-start gap-3">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl ${index % 2 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"}`}
                >
                  {insight.key === "peak-hour" ? (
                    <Clock3 className="size-5" aria-hidden="true" />
                  ) : insight.key === "product-demand" ? (
                    <Package className="size-5" aria-hidden="true" />
                  ) : insight.key === "order-type" ? (
                    <ShoppingBag className="size-5" aria-hidden="true" />
                  ) : insight.key === "order-volume" ? (
                    <TrendingUp className="size-5" aria-hidden="true" />
                  ) : (
                    <WalletCards className="size-5" aria-hidden="true" />
                  )}
                </span>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {insight.message}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section
        className="grid gap-6 xl:grid-cols-2"
        aria-label="Operational volume and revenue trends"
      >
        <ChartCard
          title={
            <span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span>Average Sales per Transaction Trend</span>
              <span className="w-fit rounded-md bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {selectedDateRange}
              </span>
            </span>
          }
          footer={
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                Average Sales per Transaction Interpretation
              </p>
              {averageSalesTrend ? (
                <>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {formatTimePeriod(
                        averageSalesTrend.highest.date,
                        averageSalesGranularity,
                        true,
                      )}
                    </span>{" "}
                    recorded the highest average sales per transaction at{" "}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatExactCurrency(averageSalesTrend.highest.value)}
                    </span>
                    , while{" "}
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      {formatTimePeriod(
                        averageSalesTrend.lowest.date,
                        averageSalesGranularity,
                        true,
                      )}
                    </span>{" "}
                    recorded the lowest at{" "}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatExactCurrency(averageSalesTrend.lowest.value)}
                    </span>
                    .
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Difference: {formatExactCurrency(averageSalesTrend.difference)}
                    {averageSalesTrendObservation
                      ? ` · ${averageSalesTrendObservation}`
                      : ""}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Not enough transaction-value data to interpret this period.
                </p>
              )}
            </div>
          }
        >
          {data.averageSalesPerTransactionTrend.length === 0 ? (
            <ChartEmptyState message="No transaction-value trend is available." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={displayedAverageSalesTrend}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => formatTimePeriod(String(value), averageSalesGranularity)}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  minTickGap={28}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={averageSalesDomain}
                  tickFormatter={formatCompactCurrency}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(value) => formatTimePeriod(String(value), averageSalesGranularity, true)}
                  formatter={(value: number) => [
                    formatCurrency(Number(value)),
                    "Average sales / transaction",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    borderColor: "#cbd5e1",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="averageSalesPerTransaction"
                  stroke={FOREST_GREEN}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title={
            <span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span>Order Volume Trend</span>
              <span className="w-fit rounded-md bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {selectedDateRange}
              </span>
            </span>
          }
          footer={
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                Order Volume Interpretation
              </p>
              {orderVolumeTrend ? (
                <>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {formatTimePeriod(
                        orderVolumeTrend.highest.date,
                        orderVolumeGranularity,
                        true,
                      )}
                    </span>{" "}
                    recorded the highest order volume with{" "}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatNumber(orderVolumeTrend.highest.value)} transactions
                    </span>
                    , while{" "}
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      {formatTimePeriod(
                        orderVolumeTrend.lowest.date,
                        orderVolumeGranularity,
                        true,
                      )}
                    </span>{" "}
                    recorded the lowest with{" "}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatNumber(orderVolumeTrend.lowest.value)} transactions
                    </span>
                    .
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Difference: {formatNumber(orderVolumeTrend.difference)} transactions
                    {orderVolumeTrendObservation
                      ? ` · ${orderVolumeTrendObservation}`
                      : ""}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Not enough order-volume data to interpret this period.
                </p>
              )}
            </div>
          }
        >
          {data.dailyTransactionDistribution.length === 0 ? (
            <ChartEmptyState message="No daily order-volume data is available." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={displayedOrderVolumeTrend}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => formatTimePeriod(String(value), orderVolumeGranularity)}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  domain={orderVolumeDomain}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(value) => formatTimePeriod(String(value), orderVolumeGranularity, true)}
                  formatter={(value: number) => [
                    formatNumber(Number(value)),
                    "Orders",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    borderColor: "#cbd5e1",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="transactionCount"
                  stroke={FOREST_GREEN}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      <section aria-labelledby="operations-distribution-heading">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            Operational mix
          </p>
          <h3
            id="operations-distribution-heading"
            className="mt-1 text-lg font-semibold text-slate-950 dark:text-white"
          >
            Order, Channel & Payment Distribution
          </h3>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <ChartCard
            title="Order Type Distribution"
            description="Completed-order distribution by recorded order type."
            footer={
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                  Order Type Distribution Interpretation
                </p>
                {leadingOrderType && totalOrderTypeTransactions > 0 ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {leadingOrderType.label}
                    </span>{" "}
                    was the most common order type with{" "}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatNumber(leadingOrderType.transactionCount)} completed transactions
                    </span>{" "}
                    ({((leadingOrderType.transactionCount / totalOrderTypeTransactions) * 100).toFixed(1)}%).
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    No order-type distribution is available for this period.
                  </p>
                )}
              </div>
            }
          >
            <DistributionChart
              rows={orderTypeRows}
              emptyMessage="No order type data is available."
              metric="transactionCount"
            />
          </ChartCard>
          <ChartCard
            title="Sales Channel Distribution"
            description="Revenue contribution by sales channel."
            footer={
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                  Sales Channel Distribution Interpretation
                </p>
                {leadingSalesChannel && totalSalesChannelRevenue > 0 ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {leadingSalesChannel.label}
                    </span>{" "}
                    led channel revenue at{" "}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatExactCurrency(leadingSalesChannel.revenue)}
                    </span>{" "}
                    ({((leadingSalesChannel.revenue / totalSalesChannelRevenue) * 100).toFixed(1)}% of recorded channel revenue).
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    No sales-channel distribution is available for this period.
                  </p>
                )}
              </div>
            }
          >
            <DistributionChart
              rows={salesChannelRows}
              emptyMessage="No sales channel data is available."
              legendLayout="stack"
            />
          </ChartCard>
          <ChartCard
            title="Payment Method Distribution"
            description="Imported payment amounts by method; these are reported separately from transaction Net Sales."
            footer={
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                  Payment Method Interpretation
                </p>
                {leadingPaymentMethod && totalRecordedPaymentAmount > 0 ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {leadingPaymentMethod.label}
                    </span>{" "}
                    led at{" "}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatExactCurrency(leadingPaymentMethod.revenue)}
                    </span>{" "}
                    ({((leadingPaymentMethod.revenue / totalRecordedPaymentAmount) * 100).toFixed(1)}%)
                    {secondPaymentMethod
                      ? <>{", followed by "}<span className="font-semibold text-slate-900 dark:text-slate-100">{secondPaymentMethod.label}</span></>
                      : null}
                    .
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    No recorded payment amounts are available for this period.
                  </p>
                )}
              </div>
            }
          >
            {paymentMethodRows.length === 0 ? (
              <ChartEmptyState message="No payment method data is available." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={paymentMethodRows}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={formatCompactCurrency}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={136}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      formatExactCurrency(Number(value)),
                      "Recorded payment amount",
                    ]}
                    contentStyle={{
                      borderRadius: "12px",
                      borderColor: "#cbd5e1",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    radius={[0, 5, 5, 0]}
                  >
                    {paymentMethodRows.map((row) => (
                      <Cell
                        key={row.label}
                        fill={paymentMethodColor(row.label)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </section>

      <section aria-label="Product demand">
        <ChartCard
          title="Product Demand Patterns"
          description="Top 10 products by recorded quantity sold."
        >
          {productDemandRows.length === 0 ? (
            <ChartEmptyState message="No product-demand data is available." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={displayedProductDemand}
                layout="vertical"
                margin={{ top: 8, right: 52, left: 4, bottom: 0 }}
                barCategoryGap="18%"
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="#cbd5e1"
                  strokeDasharray="3 3"
                  opacity={0.55}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickCount={5}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="productName"
                  width={164}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatNumber(Number(value)),
                    "Quantity sold",
                  ]}
                  labelFormatter={(_label, items) =>
                    items[0]?.payload?.category ?? "Product"
                  }
                  contentStyle={{
                    borderRadius: "12px",
                    borderColor: "#cbd5e1",
                  }}
                />
                <Bar
                  dataKey="quantitySold"
                  radius={[0, 5, 5, 0]}
                  maxBarSize={28}
                >
                  {displayedProductDemand.map((row, index) => (
                    <Cell
                      key={row.productId}
                      fill={index === 0 ? GOLD : FOREST_GREEN}
                    />
                  ))}
                  <LabelList
                    dataKey="quantitySold"
                    position="right"
                    fill="#64748b"
                    fontSize={11}
                    formatter={(value) => formatNumber(Number(value))}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      <section aria-label="Payment summary">
        <div className="mb-3 flex items-center gap-2">
          <CreditCard
            className="size-4 text-emerald-700 dark:text-emerald-300"
            aria-hidden="true"
          />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            Payment activity
          </p>
        </div>
        <PaymentSummary rows={paymentMethodRows} />
      </section>
    </div>
  );
}
