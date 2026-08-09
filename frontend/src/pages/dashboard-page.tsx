import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import {
  EmptyState,
  ErrorState,
  LoadingSpinner,
} from "../components/ui/states";
import { useSalesSummary } from "../hooks/use-sales-analytics";
import {
  useHourlySales,
  useDailySales,
  useDiscountDistribution,
  useMonthlySales,
  useOrderTypeSales,
} from "../hooks/use-sales-analytics";
import { dashboardApi } from "../services/dashboard.api";
import { api } from "../services/api-client";
import { DashboardDateRangeControl } from "../components/dashboard-date-range-control";

const money = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export function DashboardPage() {
  const [range, setRange] = useState<{ startDate?: string; endDate?: string }>(
    {},
  );
  const [dateRangeOpenSignal, setDateRangeOpenSignal] = useState(0);
  const summary = useQuery({
    queryKey: ["dashboard", "summary", range],
    queryFn: () => dashboardApi.summary(range),
  });
  const trend = useQuery({
    queryKey: ["dashboard", "trend", range],
    queryFn: () => dashboardApi.trend(range),
  });
  const channels = useQuery({
    queryKey: ["dashboard", "channels", range],
    queryFn: () => dashboardApi.channels(range),
  });
  const products = useQuery({
    queryKey: ["dashboard", "products", range],
    queryFn: () => dashboardApi.products(range),
  });
  const sales = useSalesSummary(range);
  const monthlySales = useMonthlySales(range);
  const hourlySales = useHourlySales(range);
  const dailySales = useDailySales(range);
  const orderTypes = useOrderTypeSales(range);
  const discounts = useDiscountDistribution(range);
  const topTransactions = useQuery({
    queryKey: ["dashboard", "top-transactions", range],
    queryFn: () =>
      api
        .get<{
          data: {
            transactions: Array<{
              id: string;
              sourceTransactionId: string;
              occurredAt: string;
              orderType: string;
              netSales: number;
            }>;
          };
        }>("/transactions", {
          params: { ...range, page: 1, pageSize: 10, sortBy: "netSales", sortOrder: "desc" },
        })
        .then((response) => response.data.data.transactions),
  });
  const dashboardHeader = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
          Under the Balete
        </p>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Live sales intelligence from imported POS data.
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
            No imported POS data is available for the selected date range.
          </p>
          <button
            type="button"
            onClick={() => setDateRangeOpenSignal((signal) => signal + 1)}
            className="mt-5 rounded-md bg-emerald-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            Change Date Range
          </button>
        </article>
      </section>
    );
  const total = summary.data.totalSales;
  const cards: Array<[string, string, string]> = [
    [
      "Gross Sales",
      money(sales.data?.grossSales ?? 0),
      "Gross sales for selected period",
    ],
    [
      "Net Sales",
      money(sales.data?.netSales ?? summary.data.totalSales),
      "Net sales for selected period",
    ],
    [
      "Discounts",
      money(sales.data?.totalDiscounts ?? 0),
      "Recorded transaction discounts",
    ],
    [
      "Service Charge",
      money(sales.data?.serviceCharges ?? 0),
      "Recorded service charges",
    ],
    [
      "Average Order Value",
      money(sales.data?.averageOrderValue ?? summary.data.averageOrderValue),
      "Average sales per transaction",
    ],
    [
      "Transactions",
      (
        sales.data?.totalTransactions ?? summary.data.totalTransactions
      ).toLocaleString(),
      "Completed POS transactions",
    ],
    [
      "Guests Served",
      Math.round(
        summary.data.averageGuests * summary.data.totalTransactions,
      ).toLocaleString(),
      "From recorded guest counts",
    ],
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
    color: string,
  ) => (
    <article className="rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="font-semibold">{title}</h3>
      <p className="mb-4 text-sm text-slate-500">{subtitle}</p>
      {state.isLoading ? (
        <div className="h-72 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      ) : state.isError ? (
        <ErrorState message="Unable to load sales data." />
      ) : !state.data?.length ? (
        <EmptyState title="No sales data available for the selected period." />
      ) : (
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={state.data}>
              <XAxis
                dataKey={xKey}
                tickFormatter={
                  xKey === "hour"
                    ? (value) =>
                        `${Number(value) % 12 || 12} ${Number(value) >= 12 ? "PM" : "AM"}`
                    : undefined
                }
              />
              <YAxis
                tickFormatter={(value) => `₱${Math.round(value / 1000)}K`}
              />
              <Tooltip formatter={(value) => money(Number(value))} />
              <Bar dataKey="sales" fill={color} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
  return (
    <section className="space-y-6">
      {dashboardHeader}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, detail]) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
            <p className="mt-2 text-xs text-slate-500">{detail}</p>
          </article>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900 xl:col-span-2">
          <h3 className="mb-4 font-semibold">Sales trend</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={trend.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis
                  tickFormatter={(value) => `₱${Math.round(value / 1000)}K`}
                />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Line
                  dataKey="sales"
                  stroke="#047857"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-4 font-semibold">Sales channel</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart layout="vertical" data={channels.data ?? []}>
                <XAxis
                  type="number"
                  tickFormatter={(value) => `₱${Math.round(value / 1000)}K`}
                />
                <YAxis type="category" dataKey="channel" width={80} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="sales" fill="#b8860b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {chartCard(
          "Monthly Sales",
          "Sales performance by month",
          monthlySales,
          "date",
          "#b45309",
        )}
        {chartCard(
          "Sales by Hour",
          "Sales distribution across operating hours",
          hourlySales,
          "hour",
          "#047857",
        )}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="font-semibold">Order Type</h3>
          <p className="mb-4 text-sm text-slate-500">
            Sales performance by order type
          </p>
          {orderTypes.isLoading ? (
            <div className="h-72 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          ) : orderTypes.isError ? (
            <ErrorState message="Unable to load order type data." />
          ) : !orderTypes.data?.length ? (
            <EmptyState title="No order type data available for the selected period." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={orderTypes.data} layout="vertical">
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `₱${Math.round(value / 1000)}K`}
                  />
                  <YAxis
                    type="category"
                    dataKey="orderType"
                    width={90}
                  />
                  <Tooltip
                    formatter={(value) => money(Number(value))}
                  />
                  <Bar dataKey="netSales" fill="#b45309" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
        <article className="rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="font-semibold">Discount Distribution</h3>
          <p className="mb-4 text-sm text-slate-500">
            Discounts applied during the selected period
          </p>
          {discounts.isLoading ? (
            <div className="h-72 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          ) : discounts.isError ? (
            <ErrorState message="Unable to load discount distribution." />
          ) : !(discounts.data?.data ?? []).length ? (
            <EmptyState title="No discounts recorded for the selected period." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={discounts.data?.data ?? []} layout="vertical">
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `₱${Math.round(Number(value) / 1000)}K`}
                  />
                  <YAxis
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

                      const total = discounts.data?.totalDiscountAmount ?? 0;
                      const share = total
                        ? (row.discountAmount / total) * 100
                        : 0;

                      return (
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md dark:border-slate-700 dark:bg-slate-900">
                          <p className="font-semibold">{row.discountType}</p>
                          <p>Discounts: {money(row.discountAmount)}</p>
                          <p>Transactions: {row.transactionCount.toLocaleString()}</p>
                          <p>Share: {share.toFixed(1)}%</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="discountAmount" fill="#b45309" />
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
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Top Transactions</h3>
          <Link to="/transactions" className="text-sm text-emerald-800 dark:text-amber-300">View All</Link>
        </div>
        {topTransactions.isLoading ? <div className="h-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" /> : topTransactions.isError ? <ErrorState message="Unable to load top transactions." /> : !topTransactions.data?.length ? <EmptyState title="No transactions available for the selected period." /> : <table className="w-full min-w-[38rem] text-sm"><thead><tr><th className="text-left">Rank</th><th className="text-left">Transaction ID</th><th className="text-left">Date</th><th className="text-left">Order Type</th><th className="text-right">Net Sales</th></tr></thead><tbody>{topTransactions.data.map((transaction, index) => <tr key={transaction.id} className="border-t"><td className="py-2">{index + 1}</td><td>{transaction.sourceTransactionId}</td><td>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(transaction.occurredAt))}</td><td>{transaction.orderType}</td><td className="text-right">{money(transaction.netSales)}</td></tr>)}</tbody></table>}
      </article>
      <article className="overflow-x-auto rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex justify-between">
          <h3 className="font-semibold">Top products</h3>
          <Link
            to="/products"
            className="text-sm text-emerald-800 dark:text-amber-300"
          >
            View All
          </Link>
        </div>
        <table className="w-full min-w-[42rem] text-sm">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Product</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Revenue</th>
              <th>Contribution</th>
            </tr>
          </thead>
          <tbody>
            {(products.data ?? []).map((product, index) => (
              <tr key={product.productId} className="border-t">
                <td className="py-2">{index + 1}</td>
                <td>{product.productName}</td>
                <td>{product.category}</td>
                <td>{product.quantitySold}</td>
                <td>{money(product.revenue)}</td>
                <td>
                  {total
                    ? `${((product.revenue / total) * 100).toFixed(1)}%`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}

function SalesDayRanking({ title, rows, loading, error, lowest }: { title: string; rows: Array<{ date?: string; sales: number }> | undefined; loading: boolean; error: boolean; lowest: boolean }) {
  const ranking = [...(rows ?? [])].sort((left, right) => lowest ? left.sales - right.sales : right.sales - left.sales).slice(0, 5);
  return <article className="rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><h3 className="mb-4 font-semibold">{title}</h3>{loading ? <div className="h-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" /> : error ? <ErrorState message="Unable to load sales-day data." /> : !ranking.length ? <EmptyState title="No sales-day data available for the selected period." /> : <table className="w-full text-sm"><thead><tr><th className="text-left">Rank</th><th className="text-left">Date</th><th className="text-right">Net Sales</th></tr></thead><tbody>{ranking.map((row, index) => <tr key={row.date} className="border-t"><td className="py-2">{index + 1}</td><td>{row.date ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${row.date}T00:00:00Z`)) : "—"}</td><td className="text-right">{money(row.sales)}</td></tr>)}</tbody></table>}</article>;
}
