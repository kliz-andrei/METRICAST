import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CalendarDays,
  ChartNoAxesCombined,
  CircleAlert,
  Coins,
  Gauge,
  Info,
  Package,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "../components/ui/states";
import {
  useDemandProducts,
  useGenerateNetSalesForecast,
  useGenerateProductDemand,
} from "../hooks/useForecasting";
import { useSalesSummary } from "../hooks/use-sales-analytics";
import type {
  ForecastTarget,
  NetSalesForecast,
} from "../services/forecasting.api";
import { FinancialProjectionSection } from "../components/financial/financial-projection-section";

const peso = (value: number) =>
  `${value < 0 ? "-" : ""}₱${Math.round(Math.abs(value)).toLocaleString("en-PH")}`;
const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T00:00:00Z`))
    : "—";
const formatMonth = (value: string) =>
  new Intl.DateTimeFormat("en-PH", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T00:00:00Z`));
const targets = [
  { value: "net_sales", label: "Sales", icon: Coins, enabled: true },
  {
    value: "transaction_volume",
    label: "Number of Transactions",
    icon: Activity,
    enabled: true,
  },
  {
    value: "guest_count",
    label: "Guest Count",
    icon: TrendingUp,
    enabled: true,
  },
  {
    value: "product_demand",
    label: "Product Demand",
    icon: Package,
    enabled: true,
  },
  {
    value: "category_sales",
    label: "Category Sales",
    icon: ChartNoAxesCombined,
    enabled: false,
  },
] as const;

function MetricCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail?: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </article>
  );
}
function ChartTooltip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload?: { coverage?: string };
  }>;
  label?: string;
  money: boolean;
}) {
  if (!active || !payload?.length) return null;
  const month = label?.length === 7;
  const coverage = payload[0]?.payload?.coverage;
  return (
    <div className="rounded-lg border bg-white p-3 text-sm shadow-lg dark:bg-slate-900">
      <p className="font-semibold">
        {month ? formatMonth(label ?? "") : formatDate(label)}
      </p>
      {payload.map((row) => (
        <p key={row.name} style={{ color: row.color }}>
          {row.name}:{" "}
          {money
            ? peso(row.value)
            : Math.round(row.value).toLocaleString("en-PH")}
        </p>
      ))}
      {coverage ? (
        <p className="mt-1 text-xs text-slate-500">
          Forecast coverage: {coverage}
        </p>
      ) : null}
    </div>
  );
}
function monthlyTotals(rows: Array<{ date: string; value: number }>) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    totals.set(month, (totals.get(month) ?? 0) + row.value);
  }
  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({ date, value }));
}
function monthlyForecastTotals(
  rows: Array<{ date: string; predicted: number }>,
) {
  const totals = new Map<
    string,
    { value: number; start: string; end: string }
  >();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    const current = totals.get(month);
    totals.set(
      month,
      current
        ? {
            value: current.value + row.predicted,
            start: current.start,
            end: row.date,
          }
        : { value: row.predicted, start: row.date, end: row.date },
    );
  }
  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      date,
      value: value.value,
      coverage: `${formatDate(value.start)}–${formatDate(value.end)}`,
    }));
}

function ForecastAccuracyEvaluation({
  data,
  money,
  measure,
  format,
}: {
  data: NetSalesForecast;
  money: boolean;
  measure: string;
  format: (value: number, suffix?: string) => string;
}) {
  const validation = data.validation ?? [];
  const actualLabel = money ? "Actual Sales" : `Actual ${measure}`;
  const predictedLabel = money ? "Predicted Sales" : `Predicted ${measure}`;
  const tick = money
    ? (value: number) => `₱${Math.round(value / 1_000)}K`
    : (value: number) => Math.round(value).toLocaleString("en-PH");
  const mape = data.metrics.mape;
  const rmse = data.metrics.rmse;
  const hasMetrics = mape !== null || rmse !== null;
  if (!validation.length)
    return (
      <section className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-semibold">Forecast Accuracy Evaluation</h3>
        <p className="mt-2 text-sm text-slate-500">
          No validation observations are available for this forecast.
        </p>
      </section>
    );
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            Objective 5 · Forecast Model Performance
          </p>
          <h3 className="mt-1 font-semibold">Forecast Accuracy Evaluation</h3>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Evaluation of SARIMA predictions against actual sales during the
            validation period.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
          SARIMA validation
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Training Period
          </p>
          <p className="mt-1 text-sm font-medium">
            {formatDate(data.trainingPeriod?.start)} –{" "}
            {formatDate(data.trainingPeriod?.end)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Validation Period
          </p>
          <p className="mt-1 text-sm font-medium">
            {formatDate(data.validationPeriod?.start)} –{" "}
            {formatDate(data.validationPeriod?.end)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Validation Observations
          </p>
          <p className="mt-1 text-sm font-medium">
            {data.metrics.validationObservations.toLocaleString()}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Validation uses historical data that was not used to train the model.
        MAPE and RMSE summarize the forecast error.
      </p>
      {hasMetrics ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-emerald-900/15 bg-emerald-50/50 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
              MAPE
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {mape === null ? "—" : `${mape.toFixed(2)}%`}
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Mean Absolute Percentage Error
            </p>
            <p
              title="Measures the average percentage difference between actual and predicted sales."
              className="mt-2 text-xs text-slate-500"
            >
              Measures the average percentage difference between actual and
              forecasted sales.
            </p>
            {money && mape !== null ? (
              <p className="mt-2 text-xs text-slate-500">
                MAPE is {mape < 20 ? "below" : "above"} the study’s 20%
                acceptable threshold.
              </p>
            ) : null}
          </article>
          <article className="rounded-xl border border-violet-900/15 bg-violet-50/50 p-4 dark:border-violet-800/40 dark:bg-violet-950/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-300">
              RMSE
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {rmse === null ? "—" : format(rmse)}
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Root Mean Square Error
            </p>
            <p
              title="Measures the magnitude of forecasting errors and gives greater weight to larger errors."
              className="mt-2 text-xs text-slate-500"
            >
              Measures forecast-error magnitude in sales-value terms, with
              greater weight for larger errors.
            </p>
          </article>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800">
          Forecast accuracy evaluation is unavailable for this forecast.
        </p>
      )}
      <div className="mt-6">
        <h4 className="font-semibold">
          {money
            ? "Actual vs Predicted Sales — Validation Period"
            : `Actual vs Predicted ${measure} — Validation Period`}
        </h4>
        <p className="mt-1 text-sm text-slate-500">
          Known historical values compared with the corresponding SARIMA
          predictions.
        </p>
        <div className="mt-4 h-80">
          <ResponsiveContainer>
            <LineChart data={validation}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                minTickGap={26}
              />
              <YAxis tickFormatter={tick} width={76} />
              <Tooltip content={<ChartTooltip money={money} />} />
              <Legend />
              <Line
                name={actualLabel}
                type="monotone"
                dataKey="actual"
                stroke="#047857"
                strokeWidth={3}
                dot={false}
              />
              <Line
                name={predictedLabel}
                type="monotone"
                dataKey="predicted"
                stroke="#7c3aed"
                strokeWidth={3}
                strokeDasharray="6 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-5 max-h-72 overflow-auto">
        <table className="w-full min-w-[38rem] text-sm">
          <thead className="sticky top-0 bg-white text-left text-slate-500 dark:bg-slate-900">
            <tr>
              <th className="py-2">Date</th>
              <th className="py-2 text-right">{actualLabel}</th>
              <th className="py-2 text-right">{predictedLabel}</th>
              <th className="py-2 text-right">Forecast Error</th>
            </tr>
          </thead>
          <tbody>
            {validation.map((row) => (
              <tr key={row.date} className="border-t">
                <td className="py-2">{formatDate(row.date)}</td>
                <td className="py-2 text-right">{format(row.actual)}</td>
                <td className="py-2 text-right">{format(row.predicted)}</td>
                <td className="py-2 text-right">
                  {format(Math.abs(row.error))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Excluded from MAPE:{" "}
        {data.metrics.excludedMapeObservations.toLocaleString()}
      </p>
    </section>
  );
}

function Results({
  data,
  actual,
}: {
  data: NetSalesForecast;
  actual: { grossSales?: number; netSales?: number; discounts?: number };
}) {
  const historical = data.historical ?? [];
  const validation = data.validation ?? [];
  const forecast = data.forecast ?? [];
  const money = data.target === "net_sales";
  const measure =
    targets.find((item) => item.value === data.target)?.label ?? "Sales";
  const unit =
    data.target === "transaction_volume"
      ? "transactions"
      : data.target === "guest_count"
        ? "guests"
        : "units";
  const format = (value: number, suffix?: string) =>
    money
      ? peso(value)
      : `${Math.round(value).toLocaleString("en-PH")}${suffix ? ` ${suffix}` : ""}`;
  const forecastTotal = forecast.reduce((sum, row) => sum + row.predicted, 0);
  const historicalTotal = historical.reduce((sum, row) => sum + row.value, 0);
  const historicalMonthly = monthlyTotals(historical);
  const keys = {
    historical: money ? "Actual Sales" : "Historical Actual",
    forecast: money ? "Forecasted Sales" : "Forecasted Value",
    lower: "Lower Confidence Bound",
    upper: "Upper Confidence Bound",
  };
  const monthlyForecast = monthlyForecastTotals(forecast);
  const mainChart = [
    ...historicalMonthly.map((row) => ({
      date: row.date,
      [keys.historical]: row.value,
    })),
    ...monthlyForecast.map((row) => ({
      date: row.date,
      [keys.forecast]: row.value,
      coverage: row.coverage,
    })),
  ];
  const forecastDetail = forecast.map((row) => ({
    date: row.date,
    [keys.forecast]: row.predicted,
    [keys.lower]: row.lowerBound,
    [keys.upper]: row.upperBound,
  }));
  const tick = money
    ? (value: number) => `₱${Math.round(value / 1_000)}K`
    : (value: number) => Math.round(value).toLocaleString("en-PH");
  const forecastLabel = money ? "Forecasted Sales" : `Forecasted ${measure}`;
  const trendTitle =
    data.target === "net_sales"
      ? "Sales Trend & Forecast"
      : data.target === "transaction_volume"
        ? "Transaction Volume Trend & Forecast"
        : data.target === "guest_count"
          ? "Guest Count Trend & Forecast"
          : "Product Demand Trend & Forecast";
  const first = forecast[0]?.predicted ?? 0;
  const last = forecast.at(-1)?.predicted ?? 0;
  const change = first ? ((last - first) / Math.abs(first)) * 100 : null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-900/15 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm dark:border-emerald-700/40 dark:from-emerald-950/30 dark:to-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              {money ? "Sales Forecast" : "Forecast Summary"}
            </p>
            <h3 className="mt-2 text-2xl font-bold">{measure} Forecast</h3>
            <p className="mt-1 text-sm text-slate-500">
              {money
                ? "Actual vs. Forecasted Sales"
                : "Forecasted performance based on historical POS data."}
            </p>
            {money ? (
              <p className="mt-1 text-xs text-slate-500">
                Forecast target: Net Sales
              </p>
            ) : null}
          </div>
          <span className="rounded-full bg-emerald-800 px-3 py-1 text-xs font-semibold text-white">
            SARIMA · {data.forecastHorizon} days
          </span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title={`Historical ${measure}`}
            value={format(historicalTotal, unit)}
            detail={money ? "Forecast target: Net Sales" : undefined}
          />
          <MetricCard
            title={`Forecasted ${measure}`}
            value={format(forecastTotal, unit)}
            detail={money ? "Forecast target: Net Sales" : undefined}
          />
          <MetricCard
            title="Forecast Period"
            value={`${formatDate(data.forecastPeriod?.start)} – ${formatDate(data.forecastPeriod?.end)}`}
          />
          <MetricCard
            title={`Average Forecasted ${measure}`}
            value={format(
              forecastTotal / Math.max(forecast.length, 1),
              `${unit}/day`,
            )}
            detail={money ? "Forecast target: Net Sales" : undefined}
          />
        </div>
      </section>
      {money ? (
        <section className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex gap-3">
            <Coins className="mt-0.5 size-5 text-amber-600 dark:text-amber-300" />
            <div>
              <h3 className="font-semibold">Historical Sales Context</h3>
              <p className="mt-1 text-sm text-slate-500">
                Gross Sales and Discounts are historical POS context. Forecasted
                Sales are based on Net Sales.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <MetricCard
              title="Actual Gross Sales"
              value={peso(actual.grossSales ?? 0)}
            />
            <MetricCard
              title="Actual Net Sales"
              value={peso(actual.netSales ?? 0)}
            />
            <MetricCard
              title="Actual Discounts"
              value={peso(actual.discounts ?? 0)}
            />
          </div>
        </section>
      ) : null}
      <section className="rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              Historical Sales Trend → Forecast
            </p>
            <h3 className="mt-1 font-semibold">{trendTitle}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {money
                ? "Monthly historical sales with the forecast period shown at monthly scale."
                : "Monthly historical values with the forecast period shown at monthly scale."}
            </p>
            {money ? (
              <p className="mt-1 text-xs text-slate-500">
                Forecast target: Net Sales
              </p>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Info className="size-4" />
            Confidence bounds are shown in the daily forecast detail
          </span>
        </div>
        <div className="mt-5 h-96">
          <ResponsiveContainer>
            <LineChart data={mainChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatMonth}
                minTickGap={42}
              />
              <YAxis tickFormatter={tick} width={76} />
              <Tooltip content={<ChartTooltip money={money} />} />
              <Legend />
              <ReferenceLine
                x={monthlyForecast[0]?.date}
                stroke="#047857"
                strokeDasharray="4 4"
                label={{ value: "FORECAST START", position: "top" }}
              />
              <Line
                name="Historical Actual"
                dataKey={keys.historical}
                stroke="#047857"
                strokeWidth={3}
                dot={{ r: 3, fill: '#047857', strokeWidth: 0 }}
              />
              <Line
                name="Forecasted Value"
                dataKey={keys.forecast}
                stroke="#7c3aed"
                strokeWidth={3}
                strokeDasharray="0"
                dot={{ r: 4, fill: '#7c3aed', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="rounded-2xl border bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Forecast Detail</h3>
            <p className="mt-1.5 text-sm text-slate-500">
              Projected values for the next {data.forecastHorizon} days.
            </p>
          </div>
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
            Forecast Horizon: {data.forecastHorizon} days
          </span>
        </div>
        <div className="mt-6 h-72">
          <ResponsiveContainer>
            <AreaChart data={forecastDetail}>
              <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" strokeOpacity={0.42} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) =>
                  new Intl.DateTimeFormat("en-PH", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(`${value}T00:00:00Z`))
                }
                minTickGap={24}
              />
              <YAxis tickFormatter={tick} width={76} />
              <Tooltip content={<ChartTooltip money={money} />} />
              <Area dataKey={keys.upper} stroke="none" fill="#c4b5fd" fillOpacity={0.2} legendType="none" />
              <Area dataKey={keys.lower} stroke="none" fill="#fff" fillOpacity={1} legendType="none" />
              <Line name="Forecast" dataKey={keys.forecast} stroke="#7c3aed" strokeWidth={3.5} dot={{ r: 3, fill: '#7c3aed', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-violet-600" />Forecast</span>
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-4 rounded-sm bg-violet-200/70" />Confidence range</span>
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">Shaded area shows the forecast confidence range.</p>
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-800/60">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">{forecastLabel}</th>
                <th className="px-4 py-3 text-right">Lower Confidence Bound</th>
                <th className="px-4 py-3 text-right">Upper Confidence Bound</th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((row) => (
                <tr key={row.date} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3">{formatDate(row.date)}</td>
                  <td className="px-4 py-3 text-right">{format(row.predicted)}</td>
                  <td className="px-4 py-3 text-right">{format(row.lowerBound)}</td>
                  <td className="px-4 py-3 text-right">{format(row.upperBound)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="pt-2">
        <ForecastAccuracyEvaluation
          data={data}
          money={money}
          measure={measure}
          format={format}
        />
      </div>
      <section className="rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-semibold">Forecasting Model Information</h3>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Model</dt>
            <dd>SARIMA (1,1,1)</dd>
          </div>
          <div>
            <dt className="text-slate-500">Forecasting Target</dt>
            <dd>{money ? "Net Sales" : measure}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Forecast Horizon</dt>
            <dd>{data.forecastHorizon} days</dd>
          </div>
          <div>
            <dt className="text-slate-500">Seasonality</dt>
            <dd>7-day seasonal pattern · (1,0,1,7)</dd>
          </div>
          <div>
            <dt className="text-slate-500">Training / Validation</dt>
            <dd>
              {formatDate(data.trainingPeriod?.start)} –{" "}
              {formatDate(data.trainingPeriod?.end)} training ·{" "}
              {formatDate(data.validationPeriod?.start)} –{" "}
              {formatDate(data.validationPeriod?.end)} validation
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Evaluation Measures</dt>
            <dd>MAPE · RMSE</dd>
          </div>
        </dl>
        <div className="mt-5 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
          <div className="flex gap-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium">
                Forecast Insights for Decision-Making
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                {change === null
                  ? "Forecast insights are unavailable."
                  : `${forecastLabel} provides an estimate of expected performance for the selected period. The forecast interval indicates uncertainty associated with future estimates.`}
              </p>
            </div>
          </div>
        </div>
      </section>
      {data.target === "net_sales" ? (
        <FinancialProjectionSection horizon={data.forecastHorizon} enabled />
      ) : null}
    </div>
  );
}

export function ForecastingPage() {
  const [horizon, setHorizon] = useState(14);
  const [target, setTarget] = useState<ForecastTarget>("net_sales");
  const [productId, setProductId] = useState("");
  const [result, setResult] = useState<NetSalesForecast | null>(null);
  const products = useDemandProducts();
  const sales = useSalesSummary({});
  const standard = useGenerateNetSalesForecast();
  const demand = useGenerateProductDemand();
  const loading = standard.isPending || demand.isPending;
  const error = target === "product_demand" ? demand.error : standard.error;
  const generate = () => {
    if (target === "product_demand") {
      if (productId)
        demand.mutate({ productId, horizon }, { onSuccess: setResult });
      return;
    }
    standard.mutate({ target, horizon }, { onSuccess: setResult });
  };
  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-emerald-900/15 bg-gradient-to-br from-emerald-50 via-white to-amber-50/40 p-6 dark:border-emerald-800/50 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-900">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
          Under the Balete
        </p>
        <h2 className="mt-2 text-3xl font-bold">
          Sales Forecasting &amp; Financial Projection
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Plan ahead with projected sales, costs, and profit.
        </p>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white/85 p-4 dark:border-slate-700 dark:bg-slate-900/80">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <fieldset className="min-w-0 flex-1">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Forecast
              </legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {targets.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={!item.enabled}
                      onClick={() =>
                        item.enabled && setTarget(item.value as ForecastTarget)
                      }
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${!item.enabled ? "cursor-not-allowed opacity-45" : target === item.value ? "border-emerald-700 bg-emerald-800 text-white" : "border-slate-200 bg-white hover:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"}`}
                    >
                      <Icon className="size-4" />
                      <span className="font-semibold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <label>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Forecast Horizon
              </span>
              <select
                value={horizon}
                onChange={(event) => setHorizon(Number(event.target.value))}
                className="mt-2 block h-10 rounded-lg border bg-white px-3 text-sm dark:bg-slate-950"
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
            </label>
            <button
              type="button"
              disabled={loading || (target === "product_demand" && !productId)}
              onClick={generate}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Gauge className="size-4 animate-pulse" />
              ) : (
                <CalendarDays className="size-4" />
              )}
              {loading ? "Generating Sales Forecast…" : "Generate Forecast"}
            </button>
          </div>
          {target === "net_sales" ? (
            <p className="mt-3 text-xs text-slate-500">
              Based on Net Sales
            </p>
          ) : null}
          {target === "product_demand" ? (
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className="mt-4 h-10 w-full max-w-md rounded-lg border bg-white px-3 text-sm dark:bg-slate-950"
            >
              <option value="">Select product</option>
              {(products.data?.products ?? []).map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </header>
      {error ? (
        <ErrorState
          title="Forecast request failed"
          message="METRICAST could not generate the sales forecast because the forecasting service is currently unavailable."
        />
      ) : null}
      {loading ? (
        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <LoadingSkeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
          <LoadingSkeleton className="h-96 rounded-2xl" />
        </div>
      ) : result?.available ? (
        <Results
          data={result}
          actual={{
            grossSales: sales.data?.grossSales,
            netSales: sales.data?.netSales,
            discounts: sales.data?.totalDiscounts,
          }}
        />
      ) : result?.reason ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6 dark:border-rose-900 dark:bg-rose-950/20">
          <div className="flex gap-3">
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-rose-700" />
            <div>
              <h3 className="font-semibold">Forecasting Model Unavailable</h3>
              <p className="mt-2 text-sm">
                METRICAST could not generate the sales forecast because the
                forecasting service is currently unavailable.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <EmptyState
          title="Sales Forecasting"
          description="Generate a forecast to analyze expected future sales performance. METRICAST uses historical POS sales data and SARIMA forecasting to generate short-term sales projections."
          actionLabel="Generate Forecast"
          onAction={generate}
        />
      )}
    </section>
  );
}
