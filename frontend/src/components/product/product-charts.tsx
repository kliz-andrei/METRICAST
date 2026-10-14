import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState, type ReactNode } from "react";
import { Lightbulb } from "lucide-react";
import { useSalesFilters } from "../../contexts/sales-filters-context";
import { useProductAnalytics } from "../../hooks/useProductAnalytics";
import { aggregateDatedSeries, formatTimePeriod, getTimeGranularity, getYAxisDomain } from "../../lib/chart-presentation";
import { ChartLoadingOverlay, ChartSkeleton, EmptyState, ErrorState } from "../ui/states";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
const currencyAxis = (value: number) =>
  Math.abs(value) >= 1_000_000
    ? `₱${(value / 1_000_000).toFixed(1)}M`
    : Math.abs(value) >= 1_000
      ? `₱${Math.round(value / 1_000)}K`
      : `₱${Math.round(value)}`;
const PRODUCT_TREND_COLORS = [
  "#047857",
  "#d4a72c",
  "#0f766e",
  "#ca8a04",
  "#059669",
  "#a16207",
  "#15803d",
  "#b45309",
  "#0d9488",
  "#92400e",
];
const compactDateRange = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return 'All available dates';
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return `${startDate} – ${endDate}`;
  if (start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth()) {
    const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(start);
    return `${month} ${String(start.getUTCDate()).padStart(2, '0')}–${String(end.getUTCDate()).padStart(2, '0')}, ${start.getUTCFullYear()}`;
  }
  const formatDate = (date: Date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date);
  return `${formatDate(start)} – ${formatDate(end)}`;
};
function ChartCard({
  title,
  subtitle,
  children,
  className = "",
  isRefreshing = false,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
  isRefreshing?: boolean;
}) {
  return (
    <article
      className={`relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900 ${className}`}
    >
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
      {isRefreshing ? <ChartLoadingOverlay /> : null}
    </article>
  );
}

function ProductTooltip({
  active,
  payload,
  label,
  category = false,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown> }>;
  label?: string | number;
  category?: boolean;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  const title = category
    ? String(row.category ?? label ?? "")
    : String(row.productName ?? label ?? "");
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-950">
      <p className="font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </p>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        Revenue:{" "}
        <span className="font-medium tabular-nums">
          {formatCurrency(Number(row.revenue ?? 0))}
        </span>
      </p>
      {row.quantitySold !== undefined ? (
        <p className="text-slate-500 dark:text-slate-400">
          Quantity: {Number(row.quantitySold).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}

export function ProductCharts() {
  const { filters } = useSalesFilters();
  const query = useProductAnalytics(filters);
  const [trendFilter, setTrendFilter] = useState<"all" | "top-3">("top-3");

  if (query.isLoading)
    return (
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 3 }, (_, index) => (
          <ChartSkeleton key={index} height="h-80" />
        ))}
      </div>
    );
  if (query.isError)
    return (
      <div className="mt-6">
        <ErrorState message="Unable to load product performance visuals." />
      </div>
    );
  if (!query.data || query.data.summary.totalProductsSold === 0)
    return (
      <div className="mt-6">
        <EmptyState title="No product performance data is available for this period." />
      </div>
    );

  const products = query.data.topProducts.slice(0, 10);
  const topThreeProducts = products.slice(0, 3);
  const categories = query.data.topCategories.slice(0, 5);
  const categoryTotal = categories.reduce(
    (total, category) => total + category.revenue,
    0,
  );
  const topProduct = products[0];
  const runnerUp = products[1];
  const topThreeRevenue = products
    .slice(0, 3)
    .reduce((total, product) => total + product.revenue, 0);
  const totalRevenue = query.data.summary.totalRevenue;
  const selectedDateRange = compactDateRange(filters.startDate, filters.endDate);
  const topCategory = categories[0];
  const secondCategory = categories[1];
  const topCategoryShare = topCategory && categoryTotal > 0 ? (topCategory.revenue / categoryTotal) * 100 : undefined;
  const topCategoryLead = topCategory && secondCategory ? topCategory.revenue - secondCategory.revenue : undefined;
  const productTrendGranularity = getTimeGranularity(query.data.productRevenueTrend);
  const displayedProductTrend = aggregateDatedSeries(query.data.productRevenueTrend, ["revenue"], productTrendGranularity);
  const productRevenueDomain = getYAxisDomain(displayedProductTrend.map((row) => row.revenue));
  const topProductTrendSeries = topThreeProducts.map((product, index) => ({
    key: `product-${product.productId}`,
    name: product.productName,
    color: PRODUCT_TREND_COLORS[index % PRODUCT_TREND_COLORS.length],
    points: aggregateDatedSeries(
      (query.data.topProductRevenueTrend ?? [])
        .filter((row) => row.productId === product.productId)
        .map((row) => ({ date: row.date, revenue: row.revenue })),
      ["revenue"],
      productTrendGranularity,
    ),
  }));
  const displayedTopProductTrend = (() => {
    const rows = new Map<string, Record<string, string | number>>();
    for (const series of topProductTrendSeries) {
      for (const point of series.points) {
        const current = rows.get(point.date) ?? { date: point.date };
        current[series.key] = Number(point.revenue);
        rows.set(point.date, current);
      }
    }
    return [...rows.values()].sort((left, right) =>
      String(left.date).localeCompare(String(right.date)),
    );
  })();
  const showingTopProducts = trendFilter === "top-3";
  const activeProductTrend = showingTopProducts
    ? displayedTopProductTrend
    : displayedProductTrend;
  const activeProductRevenueDomain = showingTopProducts
    ? getYAxisDomain(
        topProductTrendSeries.flatMap((series) =>
          series.points.map((point) => Number(point.revenue)),
        ),
      )
    : productRevenueDomain;
  const productInsights = [
    topProduct
      ? {
          label: "Leading product",
          detail: `${topProduct.productName} generated ${formatCurrency(topProduct.revenue)}.`,
        }
      : null,
    topProduct && totalRevenue > 0
      ? {
          label: "Revenue contribution",
          detail: `${((topProduct.revenue / totalRevenue) * 100).toFixed(1)}% of product revenue comes from the leading item.`,
        }
      : null,
    topProduct && runnerUp
      ? {
          label: "Lead over #2",
          detail: `${formatCurrency(Math.max(topProduct.revenue - runnerUp.revenue, 0))} ahead of ${runnerUp.productName}.`,
        }
      : null,
    products.length >= 3 && totalRevenue > 0
      ? {
          label: "Top 3 concentration",
          detail: `${((topThreeRevenue / totalRevenue) * 100).toFixed(1)}% of product revenue is generated by the top three.`,
        }
      : null,
  ].filter(
    (insight): insight is { label: string; detail: string } => insight !== null,
  );

  return (
    <section className="mt-8" aria-labelledby="product-performance-heading">
      <div className="mb-4">
        <h3
          id="product-performance-heading"
          className="text-xl font-bold text-slate-900 dark:text-slate-100"
        >
          Product Performance Overview
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Revenue leaders, strongest categories, and daily product revenue
          movement.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard
          title="Revenue by Product"
          subtitle="Top 10 products by revenue."
          className="xl:col-span-2"
          isRefreshing={query.isFetching && !query.isLoading}
        >
          <div className="h-80 text-slate-500 dark:text-slate-400">
            <ResponsiveContainer>
              <BarChart
                data={products}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="currentColor"
                  strokeOpacity={0.13}
                />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  tickFormatter={currencyAxis}
                />
                <YAxis
                  type="category"
                  dataKey="productName"
                  width={128}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "currentColor", fontSize: 12 }}
                />
                <Tooltip content={<ProductTooltip />} />
                <Bar
                  dataKey="revenue"
                  radius={[0, 6, 6, 0]}
                  animationDuration={350}
                >
                  {products.map((product, index) => (
                    <Cell
                      key={product.productName}
                      fill={index === 0 ? "#d4a72c" : "#047857"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {productInsights.length > 0 ? (
            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">
                  <Lightbulb className="size-4" aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Key insights
                </p>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 dark:border-emerald-400/15 dark:bg-emerald-400/10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                    {productInsights[0].label}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-700 dark:text-slate-200">
                    {productInsights[0].detail}
                  </p>
                </div>
                {productInsights.slice(1).map((insight) => (
                  <div
                    key={insight.label}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/60"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                      {insight.label}
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-700 dark:text-slate-200">
                      {insight.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </ChartCard>
        <ChartCard
          title="Top Categories"
          subtitle="Top 5 categories by product revenue."
          isRefreshing={query.isFetching && !query.isLoading}
        >
          <div className="space-y-3">
            {categories.map((category, index) => {
              const share = categoryTotal
                ? (category.revenue / categoryTotal) * 100
                : 0;
              return (
                <div
                  key={category.category}
                  className="rounded-xl p-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/70"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                      <span
                        className={`mr-2 inline-grid size-6 place-items-center rounded-full text-xs ${index === 0 ? "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
                      >
                        {index + 1}
                      </span>
                      {category.category}
                    </p>
                    <p className="shrink-0 text-sm font-medium tabular-nums">
                      {formatCurrency(category.revenue)}
                    </p>
                  </div>
                  <div className="ml-8 mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={
                        index === 0
                          ? "h-full rounded-full bg-amber-400"
                          : "h-full rounded-full bg-emerald-700 dark:bg-emerald-400"
                      }
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <p className="ml-8 mt-1 text-xs text-slate-500">
                    {share.toFixed(1)}% of top-category revenue ·{" "}
                    {category.quantitySold.toLocaleString()} sold
                  </p>
                </div>
              );
            })}
          </div>
          {topCategory && topCategoryShare !== undefined ? (
            <div className="mt-4 border-t border-slate-200/80 pt-3 dark:border-slate-800">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                <span className="font-medium text-emerald-800 dark:text-emerald-300">{topCategory.category}</span> led category revenue at <span className="font-medium tabular-nums text-slate-800 dark:text-slate-200">{formatCurrency(topCategory.revenue)}</span>, contributing <span className="font-medium tabular-nums text-slate-800 dark:text-slate-200">{topCategoryShare.toFixed(1)}%</span> of top-category revenue{topCategoryLead !== undefined && topCategoryLead > 0 ? <> and generating <span className="font-medium tabular-nums text-slate-800 dark:text-slate-200">{formatCurrency(topCategoryLead)}</span> more than the second-ranked category</> : secondCategory ? ' (tied with the second-ranked category)' : ''}.
              </p>
            </div>
          ) : (
            <p className="mt-4 border-t border-slate-200/80 pt-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">No category revenue is available for this period.</p>
          )}
        </ChartCard>
        <ChartCard
          title={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span>Daily Product Revenue Trend</span>
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                {selectedDateRange}
              </span>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>Product Filter</span>
                <select
                  value={trendFilter}
                  onChange={(event) =>
                    setTrendFilter(event.target.value as "all" | "top-3")
                  }
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/25 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  aria-label="Product Filter"
                >
                  <option value="all">All Products</option>
                  <option value="top-3">Top 3 Products</option>
                </select>
              </label>
            </span>
          }
          className="xl:col-span-3"
          isRefreshing={query.isFetching && !query.isLoading}
        >
          <div className={`${showingTopProducts ? "h-80" : "h-72"} text-slate-500 dark:text-slate-400`}>
            {showingTopProducts && displayedTopProductTrend.length === 0 ? (
              <EmptyState title="No top-product revenue trend is available for this period." />
            ) : (
              <ResponsiveContainer>
                <LineChart
                  data={activeProductTrend}
                  margin={{ top: 8, right: 12, left: 6, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="currentColor"
                    strokeOpacity={0.13}
                  />
                  <XAxis
                    dataKey="date"
                    minTickGap={36}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "currentColor", fontSize: 12 }}
                    tickFormatter={(value) => formatTimePeriod(String(value), productTrendGranularity)}
                  />
                  <YAxis
                    width={62}
                    domain={activeProductRevenueDomain}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "currentColor", fontSize: 12 }}
                    tickFormatter={currencyAxis}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !label) return null;
                      const values = (payload ?? [])
                        .filter((item) => Number.isFinite(Number(item.value)))
                        .map((item) => ({
                          color: item.color,
                          name: String(item.name ?? item.dataKey ?? "Revenue"),
                          value: Number(item.value),
                        }));
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-950">
                          <p className="font-semibold">
                            {formatTimePeriod(String(label), productTrendGranularity, true)}
                          </p>
                          {values.map((value) => (
                            <p key={value.name} className="mt-1 flex items-center gap-1.5">
                              {showingTopProducts ? (
                                <span
                                  className="size-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: value.color }}
                                  aria-hidden="true"
                                />
                              ) : null}
                              <span>{showingTopProducts ? value.name : "Revenue"}:</span>
                              <span className="font-medium tabular-nums">
                                {formatCurrency(value.value)}
                              </span>
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  {showingTopProducts ? (
                    <>
                      <Legend
                        verticalAlign="top"
                        wrapperStyle={{ fontSize: "12px", lineHeight: "1.5" }}
                      />
                      {topProductTrendSeries.map((series) => (
                        <Line
                          key={series.key}
                          type="monotone"
                          dataKey={series.key}
                          name={series.name}
                          stroke={series.color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 2 }}
                          connectNulls={false}
                          animationDuration={350}
                        />
                      ))}
                    </>
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#047857"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 2 }}
                      animationDuration={350}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </div>
    </section>
  );
}
