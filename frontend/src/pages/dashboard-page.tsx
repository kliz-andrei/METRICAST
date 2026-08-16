import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { BadgePercent, CalendarDays, Clock3, Package, Percent, ReceiptText, ShoppingBag, TrendingDown, TrendingUp, UserRound, Users } from "lucide-react";
import { Link } from "react-router-dom";
import {
  EmptyState,
  ErrorState,
  LoadingSpinner,
} from "../components/ui/states";
import { useSalesSummary } from "../hooks/use-sales-analytics";
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
import { DashboardDateRangeControl } from "../components/dashboard-date-range-control";
import { DashboardSalesChannelFilter } from "../components/dashboard-sales-channel-filter";
import { operatingHoursForRange } from "../utils/operating-hours";

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
const previousPeriod = (range: { startDate?: string; endDate?: string }) => { if (!range.startDate || !range.endDate) return undefined; const start = new Date(`${range.startDate}T00:00:00Z`); const end = new Date(`${range.endDate}T00:00:00Z`); const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1; const previousEnd = new Date(start); previousEnd.setUTCDate(previousEnd.getUTCDate() - 1); const previousStart = new Date(previousEnd); previousStart.setUTCDate(previousStart.getUTCDate() - days + 1); return { startDate: previousStart.toISOString().slice(0, 10), endDate: previousEnd.toISOString().slice(0, 10) }; };
const percentChange = (current: number, previous: number) => previous ? ((current - previous) / previous) * 100 : undefined;

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
  const [range, setRange] = useState<{ startDate?: string; endDate?: string }>(
    {},
  );
  const [dateRangeOpenSignal, setDateRangeOpenSignal] = useState(0);
  const [salesChannels, setSalesChannels] = useState<string[]>([]);
  const filters = { ...range, salesChannels };
  const summary = useQuery({
    queryKey: ["dashboard", "summary", filters],
    queryFn: () => dashboardApi.summary(filters),
  });
  const trend = useQuery({
    queryKey: ["dashboard", "trend", filters],
    queryFn: () => dashboardApi.trend(filters),
  });
  const channels = useQuery({
    queryKey: ["dashboard", "channels", filters],
    queryFn: () => dashboardApi.channels(filters),
  });
  const products = useQuery({
    queryKey: ["dashboard", "products", filters],
    queryFn: () => dashboardApi.products(filters),
  });
  const channelOptions = useQuery({
    queryKey: ["dashboard", "channel-options", range],
    queryFn: () => dashboardApi.channels(range),
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
  const [weekdayMetric, setWeekdayMetric] = useState<"averageSalesPerOccurrence" | "totalSales" | "transactions" | "guests" | "averageOrderValue">("averageSalesPerOccurrence");
  const dashboardHeader = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <p className="text-sm font-medium leading-none text-amber-700 dark:text-amber-300">
          Under the Balete
        </p>
        <h2 className="text-3xl font-bold leading-tight">Dashboard</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Business performance overview based on imported POS data.
        </p>
      </div>
      <DashboardDateRangeControl
        applied={range}
        onApply={setRange}
        openSignal={dateRangeOpenSignal}
      />
    </div>
  );

  if (summary.isLoading || sales.isLoading)
    return (
      <section className="space-y-6">
        {dashboardHeader}
        <article className="flex min-h-64 items-center justify-center rounded-2xl border bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <LoadingSpinner />
            <span>Loading dashboard data...</span>
          </div>
        </article>
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
  const total = summary.data.totalSales;
  const guestsServed = Math.round(summary.data.averageGuests * summary.data.totalTransactions);
  const activeDays = dailySales.data?.length ?? 0;
  const selectedCalendarDays = range.startDate && range.endDate ? Math.round((new Date(`${range.endDate}T00:00:00Z`).getTime() - new Date(`${range.startDate}T00:00:00Z`).getTime()) / 86_400_000) + 1 : activeDays;
  const previousDays = priorRange ? Math.round((new Date(`${priorRange.endDate}T00:00:00Z`).getTime() - new Date(`${priorRange.startDate}T00:00:00Z`).getTime()) / 86_400_000) + 1 : 0;
  const operatingHours = operatingHoursForRange(range, operatingDayScope.data ?? []);
  const previousOperatingHours = priorRange
    ? operatingHoursForRange(priorRange)
    : undefined;
  const comparison = (current: number, previous: number | undefined) => previous === undefined ? undefined : percentChange(current, previous);
  const cards: Array<{ label: string; value: string; detail: string; icon: typeof ReceiptText; comparison?: number }> = [
    {
      label: "Gross Sales",
      value: money(sales.data?.grossSales ?? 0),
      detail: "Gross sales for selected period",
      icon: ReceiptText,
      comparison: comparison(sales.data?.grossSales ?? 0, previousKpis.data?.grossSales),
    },
    {
      label: "Average Daily Sales",
      value: selectedCalendarDays ? money((sales.data?.netSales ?? total) / selectedCalendarDays) : "—",
      detail: "Average sales per day",
      icon: CalendarDays,
      comparison: comparison((sales.data?.netSales ?? total) / (selectedCalendarDays || 1), previousKpis.data ? previousKpis.data.netSales / (previousDays || 1) : undefined),
    },
    {
      label: "Average Sales per Hour",
      value: operatingHours
        ? money((sales.data?.netSales ?? total) / operatingHours)
        : "—",
      detail: operatingHours
        ? "Average sales generated per operating hour"
        : "No applicable operating dates in the selected period",
      icon: Clock3,
      comparison:
        operatingHours && previousOperatingHours
          ? comparison(
              (sales.data?.netSales ?? total) / operatingHours,
              previousKpis.data
                ? previousKpis.data.netSales / previousOperatingHours
                : undefined,
            )
          : undefined,
    },
    {
      label: "Guests Served",
      value: guestsServed.toLocaleString(),
      detail: "Total recorded guests",
      icon: Users,
    },
    {
      label: "Revenue per Guest",
      value: guestsServed ? money((sales.data?.netSales ?? total) / guestsServed) : "—",
      detail: "Average net sales per guest",
      icon: UserRound,
    },
    {
      label: "Discount Rate",
      value: sales.data?.grossSales ? `${((sales.data.totalDiscounts / sales.data.grossSales) * 100).toFixed(1)}%` : "—",
      detail: "Discounts as a share of gross sales",
      icon: Percent,
      comparison: comparison(sales.data?.grossSales ? sales.data.totalDiscounts / sales.data.grossSales : 0, previousKpis.data?.grossSales ? previousKpis.data.totalDiscounts / previousKpis.data.grossSales : undefined),
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
        {cards.map(({ label, value, detail, icon: Icon, comparison: change }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:border-emerald-800/30 dark:border-slate-700 dark:bg-slate-900 motion-reduce:transition-none"
          >
            <div className="flex items-center justify-between gap-3"><p className="text-sm text-slate-600 dark:text-slate-400">{label}</p><Icon className="size-4 text-emerald-800 dark:text-amber-300" /></div>
            <p className="mt-2 text-2xl font-bold">{value}</p>
            {change !== undefined && <p className={`mt-1 text-xs font-medium ${change >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>{change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% vs previous period</p>}
            <p className="mt-2 text-xs text-slate-500">{detail}</p>
          </article>
        ))}
      </div>
      <KeyInsights summary={summary.data} sales={sales.data} previousSales={previousSales.data} dailySales={dailySales.data ?? []} hourlySales={hourlySales.data ?? []} products={products.data ?? []} channels={channels.data ?? []} />
      <div className="grid gap-6 xl:grid-cols-3">
        <article className={`${chartCardClass} xl:col-span-2`}>
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><TrendingUp className="size-4 text-emerald-800 dark:text-emerald-300" />Sales trend</h3>
          <div className="h-72 text-slate-500 dark:text-slate-400">
            <ResponsiveContainer>
              <LineChart data={trend.data ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.14} />
                <XAxis {...chartAxisProps} dataKey="date" minTickGap={20} />
                <YAxis
                  {...chartAxisProps}
                  width={58}
                  tickFormatter={currencyAxis}
                />
                <Tooltip cursor={{ stroke: chartColors.neutral, strokeOpacity: 0.3 }} content={({ active, payload, label }) => <MetricTooltip active={active} payload={payload} title={String(label)} metricLabel="Sales" valueKey="sales" />} />
                <Line
                  dataKey="sales"
                  stroke={chartColors.primary}
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className={chartCardClass}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="font-semibold">Sales channel</h3>
            <DashboardSalesChannelFilter channels={(channelOptions.data ?? []).map((item) => item.channel).sort((left, right) => left.localeCompare(right))} value={salesChannels} onApply={setSalesChannels} />
          </div>
          <div className="h-72 text-slate-500 dark:text-slate-400">
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
        </article>
      </div>
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

function KeyInsights({ summary, sales, previousSales, dailySales, hourlySales, products, channels }: { summary: { totalTransactions: number; averageGuests: number } | undefined; sales: { netSales: number } | undefined; previousSales: { totalSales: number } | undefined; dailySales: Array<{ date?: string; sales: number }>; hourlySales: Array<{ hour?: string; sales: number }>; products: Array<{ productName: string; revenue: number }>; channels: Array<{ channel: string; sales: number }> }) {
  const insights: Array<{ title: string; text: string; icon: typeof TrendingUp }> = [];
  if (sales && previousSales && previousSales.totalSales > 0) { const change = ((sales.netSales - previousSales.totalSales) / previousSales.totalSales) * 100; insights.push({ title: 'Sales Performance', text: `Sales ${change >= 0 ? 'increased' : 'decreased'} ${Math.abs(change).toFixed(1)}% compared with the previous period.`, icon: change >= 0 ? TrendingUp : TrendingDown }); }
  const peakDay = [...dailySales].sort((a, b) => b.sales - a.sales)[0];
  if (peakDay?.date) { const date = new Date(`${peakDay.date}T00:00:00Z`); insights.push({ title: 'Peak Sales Day', text: `${new Intl.DateTimeFormat('en', { weekday: 'long' }).format(date)} generated the highest sales with ${money(peakDay.sales)}.`, icon: CalendarDays }); }
  const guests = Math.round((summary?.averageGuests ?? 0) * (summary?.totalTransactions ?? 0));
  if (sales && guests > 0) insights.push({ title: 'Average Guest Spending', text: `Average sales per guest were ${money(sales.netSales / guests)}.`, icon: Users });
  const topProduct = products[0]; if (topProduct) insights.push({ title: 'Top Product', text: `${topProduct.productName} generated the highest product revenue at ${money(topProduct.revenue)}.`, icon: ShoppingBag });
  const topChannel = [...channels].sort((a,b)=>b.sales-a.sales)[0]; if (topChannel) insights.push({ title: 'Top Sales Channel', text: `${topChannel.channel} generated the highest sales at ${money(topChannel.sales)}.`, icon: TrendingUp });
  const peakHour = [...hourlySales].sort((a,b)=>b.sales-a.sales)[0]; if (peakHour?.hour !== undefined) { const hour=Number(peakHour.hour); const label=(value:number)=>`${value % 12 || 12} ${value >= 12 ? 'PM' : 'AM'}`; insights.push({ title: 'Peak Dining Hour', text: `Sales peaked between ${label(hour)} and ${label((hour + 1) % 24)}.`, icon: Clock3 }); }
  if (!insights.length) return null;
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900"><h3 className="font-semibold">Business Insights</h3><p className="mt-1 text-sm text-slate-500">Automatically calculated from the selected POS data.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{insights.map((insight) => { const Icon = insight.icon; return <div key={insight.title} className="rounded-xl bg-slate-50 p-4 transition duration-200 motion-reduce:transition-none dark:bg-slate-800/70"><div className="flex items-center gap-2 text-emerald-800 dark:text-amber-300"><Icon className="size-4" /><p className="font-medium">{insight.title}</p></div><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{insight.text}</p></div>; })}</div></article>;
}
