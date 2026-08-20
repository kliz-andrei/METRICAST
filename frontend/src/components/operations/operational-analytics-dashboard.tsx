import {
  Bar,
  BarChart,
  Cell,
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
  CalendarDays,
  Clock3,
  CreditCard,
  ReceiptText,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";
import { useSalesFilters } from "../../contexts/sales-filters-context";
import { useOperationalAnalytics } from "../../hooks/useOperationalAnalytics";
import type {
  OperationalDistribution,
  OperationalHour,
} from "../../services/operational-analytics.api";
import { EmptyState, ErrorState, LoadingSkeleton } from "../ui/states";

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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

const formatPeakHour = (value: string | null) => {
  if (!value) return "—";
  const hour = Number(value.split(":")[0]);
  return Number.isFinite(hour) ? formatHour(hour) : value;
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));

type CardProps = {
  title: string;
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
  description: string;
};

function ChartCard({
  title,
  description,
  children,
  className,
}: ChartCardProps) {
  return (
    <Card title={title} className={className}>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {description}
      </p>
      <div className="mt-4 h-64 sm:h-72">{children}</div>
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
  helper: string;
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

type DisplayDistribution = OperationalDistribution & { label: string };

function DistributionChart({
  rows,
  emptyMessage,
}: {
  rows: DisplayDistribution[];
  emptyMessage: string;
}) {
  if (rows.length === 0) return <ChartEmptyState message={emptyMessage} />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={rows}
          dataKey="revenue"
          nameKey="label"
          innerRadius="54%"
          outerRadius="82%"
          paddingAngle={3}
          stroke="none"
        >
          {rows.map((row, index) => (
            <Cell
              key={`${row.label}-${index}`}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, _name, item) => [
            formatCurrency(Number(value)),
            `${item.payload.label} revenue`,
          ]}
          contentStyle={{ borderRadius: "12px", borderColor: "#cbd5e1" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function HourTable({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: OperationalHour[];
  emptyMessage: string;
}) {
  return (
    <Card title={title}>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[330px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="pb-3 font-medium">Hour</th>
                <th className="pb-3 text-right font-medium">Transactions</th>
                <th className="pb-3 text-right font-medium">Revenue</th>
                <th className="pb-3 text-right font-medium">Guests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.slice(0, 5).map((row) => (
                <tr
                  key={row.hour}
                  className="text-slate-700 dark:text-slate-200"
                >
                  <td className="py-3 font-medium">{formatHour(row.hour)}</td>
                  <td className="py-3 text-right">
                    {formatNumber(row.transactionCount)}
                  </td>
                  <td className="py-3 text-right">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="py-3 text-right">
                    {formatNumber(row.guestCount)}
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
        <LoadingSkeleton className="h-80 rounded-2xl" />
        <LoadingSkeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}

export function OperationalAnalyticsDashboard() {
  const { filters } = useSalesFilters();
  const { data, isLoading, isError, error, refetch } =
    useOperationalAnalytics(filters);

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

  const peakRevenueHour = [...data.hourlyOperations].sort(
    (a, b) => b.revenue - a.revenue,
  )[0];
  const peakRevenueDay = [...data.dailyOperations].sort(
    (a, b) => b.revenue - a.revenue,
  )[0];
  const peakTransactionHour = data.busiestHours[0];
  const orderTypeRows = data.orderTypeDistribution.map((row) => ({
    ...row,
    label: row.orderType,
  }));
  const salesChannelRows = data.salesChannelDistribution.map((row) => ({
    ...row,
    label: row.salesChannel,
  }));
  const paymentMethodRows = data.paymentMethodDistribution.map((row) => ({
    ...row,
    label: row.paymentMethod,
  }));

  return (
    <div className="space-y-6">
      <section aria-label="Operational performance summary">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              Operational overview
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              A concise view of transaction flow, guests, and revenue
              efficiency.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Total Transactions"
            value={formatNumber(data.summary.totalTransactions)}
            helper="Completed orders in the selected period"
            icon={<ReceiptText className="size-5" aria-hidden="true" />}
          />
          <MetricCard
            label="Avg. Guests / Transaction"
            value={data.summary.averageGuestsPerTransaction.toFixed(1)}
            helper="Average party size per completed order"
            icon={<Users className="size-5" aria-hidden="true" />}
            accent="gold"
          />
          <MetricCard
            label="Avg. Revenue / Transaction"
            value={formatCurrency(data.summary.averageRevenuePerTransaction)}
            helper="Net revenue generated per completed order"
            icon={<WalletCards className="size-5" aria-hidden="true" />}
          />
          <MetricCard
            label="Peak Operating Hour"
            value={formatPeakHour(data.summary.peakOperatingHour)}
            helper="Highest transaction volume by hour"
            icon={<Clock3 className="size-5" aria-hidden="true" />}
            accent="gold"
          />
          <MetricCard
            label="Peak Operating Day"
            value={data.summary.peakOperatingDay ?? "—"}
            helper="Day of week with the most transactions"
            icon={<CalendarDays className="size-5" aria-hidden="true" />}
            accent="slate"
          />
          <MetricCard
            label="Avg. Daily Transactions"
            value={formatNumber(
              Math.round(data.summary.averageDailyTransactions),
            )}
            helper="Typical number of completed orders each day"
            icon={<TrendingUp className="size-5" aria-hidden="true" />}
          />
        </div>
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
            Operational Insights
          </h3>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Busiest Service Window">
            <div className="mt-4 flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <Clock3 className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-lg font-bold text-slate-950 dark:text-white">
                  {peakTransactionHour
                    ? formatHour(peakTransactionHour.hour)
                    : "—"}
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  {peakTransactionHour
                    ? `${formatNumber(peakTransactionHour.transactionCount)} transactions — the busiest hour by order volume.`
                    : "No hourly transaction data is available."}
                </p>
              </div>
            </div>
          </Card>
          <Card title="Highest Revenue Hour">
            <div className="mt-4 flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <WalletCards className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-lg font-bold text-slate-950 dark:text-white">
                  {peakRevenueHour ? formatHour(peakRevenueHour.hour) : "—"}
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  {peakRevenueHour
                    ? `${formatCurrency(peakRevenueHour.revenue)} in net revenue during this service window.`
                    : "No hourly revenue data is available."}
                </p>
              </div>
            </div>
          </Card>
          <Card title="Highest Revenue Day">
            <div className="mt-4 flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <CalendarDays className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-lg font-bold text-slate-950 dark:text-white">
                  {peakRevenueDay ? formatDate(peakRevenueDay.date) : "—"}
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  {peakRevenueDay
                    ? `${formatCurrency(peakRevenueDay.revenue)} across ${formatNumber(peakRevenueDay.transactionCount)} transactions.`
                    : "No daily revenue data is available."}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section
        className="grid gap-6 xl:grid-cols-2"
        aria-label="Operational volume and revenue trends"
      >
        <ChartCard
          title="Transaction Throughput"
          description="Completed transactions by operating day."
        >
          {data.dailyTransactionDistribution.length === 0 ? (
            <ChartEmptyState message="No daily transaction data is available." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.dailyTransactionDistribution}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    formatDate(value).replace(", 2026", "")
                  }
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  minTickGap={28}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(value) => formatDate(String(value))}
                  formatter={(value: number) => [
                    formatNumber(Number(value)),
                    "Transactions",
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

        <ChartCard
          title="Hourly Revenue"
          description="Net revenue by service hour; gold marks the highest-revenue hour."
        >
          {data.hourlyRevenue.length === 0 ? (
            <ChartEmptyState message="No hourly revenue data is available." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.hourlyRevenue}
                margin={{ top: 8, right: 8, left: -10, bottom: 0 }}
              >
                <XAxis
                  dataKey="hour"
                  tickFormatter={formatHour}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatCompactCurrency}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip
                  labelFormatter={(value) => formatHour(Number(value))}
                  formatter={(value: number) => [
                    formatCurrency(Number(value)),
                    "Net revenue",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    borderColor: "#cbd5e1",
                  }}
                />
                <Bar dataKey="revenue" radius={[5, 5, 0, 0]}>
                  {data.hourlyRevenue.map((row) => (
                    <Cell
                      key={row.hour}
                      fill={
                        row.hour === peakRevenueHour?.hour ? GOLD : FOREST_GREEN
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      <section
        className="grid gap-6 xl:grid-cols-2"
        aria-label="Hourly volume and daily guest activity"
      >
        <ChartCard
          title="Hourly Transactions"
          description="Order volume by service hour; gold marks the busiest hour."
        >
          {data.hourlyTransactionDistribution.length === 0 ? (
            <ChartEmptyState message="No hourly transaction data is available." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.hourlyTransactionDistribution}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <XAxis
                  dataKey="hour"
                  tickFormatter={formatHour}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(value) => formatHour(Number(value))}
                  formatter={(value: number) => [
                    formatNumber(Number(value)),
                    "Transactions",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    borderColor: "#cbd5e1",
                  }}
                />
                <Bar dataKey="transactionCount" radius={[5, 5, 0, 0]}>
                  {data.hourlyTransactionDistribution.map((row) => (
                    <Cell
                      key={row.hour}
                      fill={
                        row.hour === peakTransactionHour?.hour
                          ? GOLD
                          : "#059669"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Daily Guest Activity"
          description="Guests served by day, based on the recorded party size for each transaction."
        >
          {data.dailyOperations.length === 0 ? (
            <ChartEmptyState message="No daily guest activity is available." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.dailyOperations}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    formatDate(value).replace(", 2026", "")
                  }
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  minTickGap={28}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(value) => formatDate(String(value))}
                  formatter={(value: number) => [
                    formatNumber(Number(value)),
                    "Guests served",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    borderColor: "#cbd5e1",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="guestCount"
                  stroke={GOLD}
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
            description="Revenue contribution by order type."
          >
            <DistributionChart
              rows={orderTypeRows}
              emptyMessage="No order type data is available."
            />
          </ChartCard>
          <ChartCard
            title="Sales Channel Distribution"
            description="Revenue contribution by sales channel."
          >
            <DistributionChart
              rows={salesChannelRows}
              emptyMessage="No sales channel data is available."
            />
          </ChartCard>
          <ChartCard
            title="Payment Method Distribution"
            description="Revenue collected by payment method."
          >
            {paymentMethodRows.length === 0 ? (
              <ChartEmptyState message="No payment method data is available." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={paymentMethodRows}
                  layout="vertical"
                  margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
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
                    width={88}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      formatCurrency(Number(value)),
                      "Revenue",
                    ]}
                    contentStyle={{
                      borderRadius: "12px",
                      borderColor: "#cbd5e1",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill={FOREST_GREEN}
                    radius={[0, 5, 5, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </section>

      <section aria-labelledby="operations-tables-heading">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            Service windows
          </p>
          <h3
            id="operations-tables-heading"
            className="mt-1 text-lg font-semibold text-slate-950 dark:text-white"
          >
            Peak & Slow Operating Hours
          </h3>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <HourTable
            title="Peak Hours"
            rows={data.busiestHours}
            emptyMessage="No peak-hour data is available."
          />
          <HourTable
            title="Slow Hours"
            rows={data.slowestHours}
            emptyMessage="No slow-hour data is available."
          />
        </div>
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
