import {
  ArrowDownUp,
  ListFilter,
  SlidersHorizontal,
  TrendingDown,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useSalesFilters } from "../../contexts/sales-filters-context";
import { useProductAnalytics } from "../../hooks/useProductAnalytics";
import type {
  CategoryPerformance,
  ProductPerformance,
} from "../../services/product-analytics.api";
import { EmptyState, ErrorState, LoadingSkeleton } from "../ui/states";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
type RankingKey =
  "revenue" | "quantitySold" | "revenueShare" | "averageRevenuePerUnit";
type SortKey = "category" | RankingKey;
type DisplayLimit = "5" | "10" | "lowest-5" | "all";

function RankingCard({
  title,
  rows,
  lowest = false,
  totalRevenue,
}: {
  title: string;
  rows: ProductPerformance[];
  lowest?: boolean;
  totalRevenue: number;
}) {
  const rankedRows = rows.slice(0, 5);
  const maxRevenue = Math.max(...rankedRows.map((row) => row.revenue), 1);
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {lowest
              ? "Lowest quantity items needing attention."
              : "Top 5 products by revenue."}
          </p>
        </div>
        {lowest ? (
          <TrendingDown
            className="size-4 text-violet-700 dark:text-violet-300"
            aria-hidden="true"
          />
        ) : (
          <Trophy
            className="size-4 text-amber-600 dark:text-amber-300"
            aria-hidden="true"
          />
        )}
      </div>
      <ol className="mt-4 space-y-1" aria-label={title}>
        {rankedRows.map((row, index) => {
          const contribution = totalRevenue
            ? (row.revenue / totalRevenue) * 100
            : 0;
          return (
            <li
              key={`${row.productName}-${row.category}`}
              tabIndex={0}
              className={`rounded-xl p-2.5 transition hover:bg-emerald-50/70 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:hover:bg-slate-800/80 ${index === 0 && !lowest ? "bg-amber-50/80 dark:bg-amber-400/10" : ""}`}
            >
              <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-2.5">
                <span
                  className={`grid size-7 place-items-center rounded-full text-xs font-bold ${index === 0 && !lowest ? "bg-amber-400 text-emerald-950" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                    {row.productName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {row.category} · {row.quantitySold.toLocaleString()} sold
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatCurrency(row.revenue)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {contribution.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="ml-10 mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${lowest ? "bg-violet-500" : "bg-emerald-700 dark:bg-emerald-400"}`}
                  style={{ width: `${(row.revenue / maxRevenue) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

function CategoryPerformanceTable({
  rows,
  totalRevenue,
}: {
  rows: CategoryPerformance[];
  totalRevenue: number;
}) {
  const [displayLimit, setDisplayLimit] = useState<DisplayLimit>("5");
  const [rankBy, setRankBy] = useState<RankingKey>("revenue");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [descending, setDescending] = useState(true);
  const valueFor = (row: CategoryPerformance, key: SortKey) => {
    if (key === "category") return row.category;
    if (key === "revenueShare")
      return totalRevenue ? row.revenue / totalRevenue : 0;
    if (key === "averageRevenuePerUnit")
      return row.revenue / Math.max(row.quantitySold, 1);
    return row[key];
  };
  const rankedRows = useMemo(
    () =>
      [...rows].sort((left, right) => {
        return Number(valueFor(right, rankBy)) - Number(valueFor(left, rankBy));
      }),
    [rankBy, rows, totalRevenue],
  );
  const selectedRows =
    displayLimit === "lowest-5"
      ? [...rows]
          .sort(
            (left, right) =>
              Number(valueFor(left, rankBy)) - Number(valueFor(right, rankBy)),
          )
          .slice(0, 5)
      : rankedRows.slice(
          0,
          displayLimit === "all" ? undefined : Number(displayLimit),
        );
  const visibleRows = useMemo(
    () =>
      [...selectedRows].sort((left, right) => {
        const leftValue = valueFor(left, sortKey);
        const rightValue = valueFor(right, sortKey);
        const comparison =
          typeof leftValue === "string"
            ? leftValue.localeCompare(String(rightValue))
            : leftValue - Number(rightValue);
        return descending ? -comparison : comparison;
      }),
    [descending, selectedRows, sortKey, totalRevenue],
  );
  const changeRankBy = (value: RankingKey) => {
    setRankBy(value);
    setSortKey(value);
    setDescending(true);
  };
  const selectSort = (key: SortKey) => {
    if (key === sortKey) setDescending((value) => !value);
    else {
      setSortKey(key);
      setDescending(true);
    }
  };
  const heading = (label: string, key: SortKey, align = "") => (
    <button
      type="button"
      onClick={() => selectSort(key)}
      aria-label={`Sort by ${label} ${key === sortKey ? (descending ? "ascending" : "descending") : "ascending"}`}
      className={`inline-flex items-center gap-1 font-medium transition hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/25 dark:hover:text-emerald-300 ${key === sortKey ? "text-emerald-800 dark:text-emerald-300" : ""} ${align}`}
    >
      <span>{label}</span>
      {key === sortKey ? (
        descending ? (
          <TrendingDown className="size-3.5" aria-hidden="true" />
        ) : (
          <TrendingDown className="size-3.5 rotate-180" aria-hidden="true" />
        )
      ) : (
        <ArrowDownUp className="size-3.5" aria-hidden="true" />
      )}
    </button>
  );
  const controlClassName =
    "h-10 w-full rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-slate-100 dark:hover:border-emerald-400/50";

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            Category Performance
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Ranked category contribution from product-level POS sales.
          </p>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
          <label className="rounded-xl border border-slate-200 bg-slate-50/80 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <ListFilter
                className="size-3.5 text-emerald-700 dark:text-emerald-300"
                aria-hidden="true"
              />
              Show rows
            </span>
            <select
              value={displayLimit}
              className={controlClassName}
              onChange={(event) =>
                setDisplayLimit(event.target.value as DisplayLimit)
              }
              aria-label="Number of category rows to show"
            >
              <option value="5">Top 5</option>
              <option value="10">Top 10</option>
              <option value="lowest-5">Lowest 5</option>
              <option value="all">All categories</option>
            </select>
          </label>
          <label className="rounded-xl border border-slate-200 bg-slate-50/80 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <SlidersHorizontal
                className="size-3.5 text-emerald-700 dark:text-emerald-300"
                aria-hidden="true"
              />
              Rank by
            </span>
            <select
              value={rankBy}
              className={controlClassName}
              onChange={(event) =>
                changeRankBy(event.target.value as RankingKey)
              }
              aria-label="Category ranking metric"
            >
              <option value="revenue">Revenue</option>
              <option value="quantitySold">Quantity Sold</option>
              <option value="revenueShare">Revenue Share</option>
              <option value="averageRevenuePerUnit">
                Average Revenue / Unit
              </option>
            </select>
          </label>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70">
            <tr>
              <th className="px-3 py-3">Rank</th>
              <th className="px-3 py-3">{heading("Category", "category")}</th>
              <th className="px-3 py-3 text-right">
                {heading("Quantity Sold", "quantitySold", "justify-end")}
              </th>
              <th className="px-3 py-3 text-right">
                {heading("Revenue", "revenue", "justify-end")}
              </th>
              <th className="px-3 py-3 text-right">
                {heading("Revenue Share", "revenueShare", "justify-end")}
              </th>
              <th className="px-3 py-3 text-right">
                {heading(
                  "Avg. Revenue / Unit",
                  "averageRevenuePerUnit",
                  "justify-end",
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => {
              const share = totalRevenue
                ? (row.revenue / totalRevenue) * 100
                : 0;
              const average = row.revenue / Math.max(row.quantitySold, 1);
              return (
                <tr
                  key={row.category}
                  className={`border-t border-slate-100 transition hover:bg-emerald-50/60 dark:border-slate-800 dark:hover:bg-slate-800/70 ${index === 0 ? "bg-amber-50/60 dark:bg-amber-400/10" : ""}`}
                >
                  <td className="px-3 py-3">
                    <span
                      className={`inline-grid size-6 place-items-center rounded-full text-xs font-semibold ${index === 0 ? "bg-amber-400 text-emerald-950" : index < 3 ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium">{row.category}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {row.quantitySold.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {share.toFixed(1)}%
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {formatCurrency(average)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export function ProductTables() {
  const { filters } = useSalesFilters();
  const query = useProductAnalytics(filters);

  if (query.isLoading)
    return (
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 3 }, (_, index) => (
          <LoadingSkeleton key={index} className="h-80" />
        ))}
      </div>
    );
  if (query.isError)
    return (
      <div className="mt-6">
        <ErrorState message="Unable to load product rankings." />
      </div>
    );
  if (!query.data || query.data.summary.totalProductsSold === 0)
    return (
      <div className="mt-6">
        <EmptyState title="No product activity found for the selected filters." />
      </div>
    );

  return (
    <section className="mt-8" aria-labelledby="product-rankings-heading">
      <div className="mb-4">
        <h3
          id="product-rankings-heading"
          className="text-xl font-bold text-slate-900 dark:text-slate-100"
        >
          Product Rankings &amp; Category Analysis
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Revenue leaders, low-quantity products, and sortable category
          contribution.
        </p>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <RankingCard
          title="Top Products"
          rows={query.data.topProducts}
          totalRevenue={query.data.summary.totalRevenue}
        />
        <RankingCard
          title="Lowest Performing Products"
          rows={query.data.lowestSellingProducts}
          totalRevenue={query.data.summary.totalRevenue}
          lowest
        />
        <div className="xl:col-span-2">
          <CategoryPerformanceTable
            rows={query.data.topCategories}
            totalRevenue={query.data.summary.totalRevenue}
          />
        </div>
      </div>
    </section>
  );
}
