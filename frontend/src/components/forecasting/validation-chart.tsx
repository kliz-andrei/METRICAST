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
import type { ForecastValidation } from "../../services/forecasting.api";
import { ChartSkeleton, EmptyState, ErrorState } from "../ui/states";

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
const currencyAxis = (value: number) => `₱${Math.round(value / 1_000)}K`;

const validationYAxisDomain = (values: number[]): [number, number] => {
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

function ValidationTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { actual: number; predicted: number } }>;
  label?: string;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  const error = row.actual - row.predicted;
  const absolutePercentageError = row.actual === 0
    ? null
    : (Math.abs(error) / Math.abs(row.actual)) * 100;

  return (
    <div className="rounded-lg border bg-white p-3 text-sm shadow-lg dark:bg-slate-900">
      <p className="font-semibold">{formatDate(label)}</p>
      <p className="mt-1 text-emerald-700 dark:text-emerald-300">Actual Sales: {peso(row.actual)}</p>
      <p className="text-violet-700 dark:text-violet-300">Predicted Sales: {peso(row.predicted)}</p>
      <p className="mt-1 text-slate-600 dark:text-slate-300">Error: {peso(error)}</p>
      <p className="text-slate-600 dark:text-slate-300">
        Absolute Percentage Error: {absolutePercentageError === null ? "—" : `${absolutePercentageError.toFixed(2)}%`}
      </p>
    </div>
  );
}

export function ForecastValidationChart({
  data,
  isLoading,
  isError,
}: {
  data?: ForecastValidation;
  isLoading: boolean;
  isError: boolean;
}) {
  const validation = data?.validation ?? [];
  const domain = validationYAxisDomain(validation.flatMap((row) => [row.actual, row.predicted]));

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      <div className="mb-4">
        <h3 className="font-semibold">Actual vs Predicted Sales</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Actual sales compared with SARIMA predictions during the selected period.
        </p>
      </div>
      {isLoading ? (
        <ChartSkeleton height="h-80" label="Loading Actual vs Forecasted Sales" />
      ) : isError ? (
        <ErrorState message="Unable to load the validation comparison." />
      ) : !data?.available || !validation.length ? (
        <EmptyState title={data?.reason ?? "Not enough historical data to validate this period."} />
      ) : (
        <div className="h-80 text-slate-500 dark:text-slate-400">
          <ResponsiveContainer>
            <LineChart data={validation} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.14} />
              <XAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "currentColor", fontSize: 12 }}
                dataKey="date"
                tickFormatter={formatDate}
                minTickGap={44}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "currentColor", fontSize: 12 }}
                domain={domain}
                tickFormatter={currencyAxis}
                width={68}
              />
              <Tooltip content={<ValidationTooltip />} />
              <Legend verticalAlign="bottom" />
              <Line
                name="Actual Sales"
                type="monotone"
                dataKey="actual"
                stroke="#047857"
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: "#047857", strokeWidth: 0 }}
              />
              <Line
                name="Predicted Sales"
                type="monotone"
                dataKey="predicted"
                stroke="#7c3aed"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={{ r: 2.5, fill: "#7c3aed", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}
