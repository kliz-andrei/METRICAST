import { ArrowRight, CircleAlert, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFinancialProjectionSummary } from "../../hooks/use-financial-projections";
import { ErrorState, LoadingSkeleton } from "../ui/states";

const money = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

function Metric({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "loss";
}) {
  return (
    <article className={`rounded-xl border p-4 ${tone === "loss" ? "border-rose-200 bg-rose-50/50 dark:border-rose-900/70 dark:bg-rose-950/20" : "border-slate-200 dark:border-slate-700"}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </article>
  );
}

export function FinancialProjectionSection({
  horizon,
  enabled,
}: {
  horizon: number;
  enabled: boolean;
}) {
  const projection = useFinancialProjectionSummary({ horizon }, enabled);
  if (!enabled) return null;
  if (projection.isLoading)
    return (
      <section className="mt-6 rounded-2xl border bg-white p-5 dark:bg-slate-900">
        <LoadingSkeleton className="h-5 w-44" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <LoadingSkeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      </section>
    );
  if (projection.isError || !projection.data)
    return (
      <section className="mt-6 rounded-2xl border bg-white p-5 dark:bg-slate-900">
        <ErrorState
          title="Unable to load financial projection"
          message="Your sales forecast remains available. Retry to load its financial estimate."
          onRetry={() => void projection.refetch()}
        />
      </section>
    );

  const data = projection.data;
  const coverage = data.costCoverage;
  if (data.status !== "READY" || !data.totals)
    return (
      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/70 dark:bg-amber-950/20">
        <div className="flex gap-3">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <h3 className="font-semibold text-amber-950 dark:text-amber-100">
              {data.status === "NO_COST_CONFIGURATION"
                ? "Financial projection is unavailable because product costs have not yet been configured."
                : data.status === "INCOMPLETE_COST_COVERAGE"
                  ? "Financial projection has incomplete cost coverage."
                  : data.status === "STALE_FORECAST"
                    ? "Financial projection needs a current Net Sales forecast."
                  : "Financial projection is currently unavailable."}
            </h3>
            <p className="mt-2 text-sm text-amber-900/80 dark:text-amber-200">
              {data.status === "INCOMPLETE_COST_COVERAGE"
                ? "Some products included in the selected period do not have configured unit costs. Complete product costing to generate a complete financial projection."
                : data.status === "STALE_FORECAST"
                  ? "Historical sales data changed after the saved forecast was generated. Generate a new Net Sales forecast before relying on estimated costs, profit, or margin."
                : `${coverage.missingProducts.toLocaleString()} of ${coverage.soldProducts.toLocaleString()} sold products require a configured unit cost before estimates can be calculated.`}
            </p>
            <p className="mt-2 text-xs text-amber-900/70 dark:text-amber-200/80">
              Configured overhead rate: {data.overheadRate.toFixed(1)}%.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span>
                <strong>{coverage.configuredProducts.toLocaleString()}</strong>{" "}
                configured ·{" "}
                <strong>{coverage.missingProducts.toLocaleString()}</strong>{" "}
                missing ·{" "}
                <strong>{coverage.productCoveragePercent.toFixed(1)}%</strong>{" "}
                coverage
              </span>
              <Link
                to="/data"
                className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline underline-offset-4 dark:text-emerald-300"
              >
                Open Product Costing <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    );

  const totals = data.totals;
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
          <WalletCards className="size-5" />
        </span>
        <div>
          <h3 className="font-semibold">Financial Projection</h3>
          <p className="mt-1 text-sm text-slate-500">
            Estimated costs and projected profit based on forecasted sales.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Forecasted Sales are based on Net Sales and configured cost
            assumptions.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Cost coverage: {coverage.configuredProducts.toLocaleString()} configured · {coverage.missingProducts.toLocaleString()} missing · {coverage.productCoveragePercent.toFixed(1)}% product coverage. Configured overhead rate: {data.overheadRate.toFixed(1)}%.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Forecasted Sales"
          value={money(data.forecast?.forecastedNetSales ?? 0)}
        />
        <Metric
          label="Estimated Product Cost"
          value={money(totals.estimatedProductCost)}
        />
        <Metric
          label="Estimated Operating Overhead"
          value={money(totals.estimatedOperatingOverhead)}
        />
        <Metric
          label="Projected Profit"
          value={money(totals.estimatedProfit)}
          detail={`Estimated margin: ${percent(totals.estimatedProfitMargin)}`}
          tone={totals.estimatedProfit < 0 ? "loss" : "default"}
        />
      </div>
      {totals.estimatedProfit < 0 ? (
        <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">
          The configured cost ratio and overhead exceed forecasted Net Sales for this period, resulting in an estimated loss.
        </p>
      ) : null}
      <details className="mt-5 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
        <summary className="cursor-pointer font-medium">Projection methodology and assumptions</summary>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Estimated product cost uses the configured historical cost ratio; operating overhead is applied to that estimate. Projected profit equals forecasted Net Sales less estimated total cost.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Product costs, overhead, profit, and margin are estimates based on configured assumptions and should not be interpreted as audited financial results.
        </p>
      </details>
      {data.projections.length ? (
        <>
          <div className="mt-5 h-72">
            <h4 className="mb-1 font-semibold">
              Forecasted Sales vs. Estimated Cost and Projected Profit
            </h4>
            <p className="mb-3 text-xs text-slate-500">
              Forecasted sales are based on Net Sales; cost and profit values are estimates.
            </p>
            <ResponsiveContainer>
              <LineChart data={data.projections}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis
                  tickFormatter={(value) => `₱${Math.round(value / 1_000)}K`}
                  width={72}
                />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Legend />
                <Line
                  dataKey="forecastedNetSales"
                  name="Forecasted Sales"
                  stroke="#047857"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  dataKey="estimatedTotalCost"
                  name="Estimated Total Cost"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  dataKey="estimatedProfit"
                  name="Projected Profit"
                  stroke="#7c3aed"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <details className="mt-5 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-medium">View daily financial projection</summary>
            <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Forecasted Sales</th>
                  <th className="pb-2 text-right">Estimated Product Cost</th>
                  <th className="pb-2 text-right">
                    Estimated Operating Overhead
                  </th>
                  <th className="pb-2 text-right">Estimated Total Cost</th>
                  <th className="pb-2 text-right">Projected Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.projections.map((row) => (
                  <tr key={row.date}>
                    <td className="py-2">{row.date}</td>
                    <td className="py-2 text-right tabular-nums">
                      {money(row.forecastedNetSales)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {money(row.estimatedProductCost)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {money(row.estimatedOperatingOverhead)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {money(row.estimatedTotalCost)}
                    </td>
                    <td className="py-2 text-right font-medium tabular-nums">
                      {money(row.estimatedProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}
