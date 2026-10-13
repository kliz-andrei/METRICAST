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
const dateOnly = (value?: string) => value ? new Date(`${value}T00:00:00Z`) : null;

const formatTooltipDate = (value?: string) => {
  const date = dateOnly(value);
  return date
    ? new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(date)
    : "—";
};
const formatAxisDate = (value?: string) => {
  const date = dateOnly(value);
  return date
    ? new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(date)
    : "—";
};
const currencyAxis = (value: number) => `₱${Math.round(value / 1_000)}K`;

type ValidationPoint = ForecastValidation["validation"][number];

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
  payload?: Array<{ payload?: ValidationPoint }>;
  label?: string;
}) {
  const row = payload?.map((entry) => entry.payload).find((entry) => entry && Number.isFinite(entry.actual) && Number.isFinite(entry.predicted));
  if (!active || !row) return null;

  const error = row.actual - row.predicted;
  const absoluteError = Math.abs(error);
  const absolutePercentageError = row.actual === 0
    ? null
    : (Math.abs(error) / Math.abs(row.actual)) * 100;

  return (
    <div className="rounded-lg border bg-white p-3 text-sm shadow-lg dark:bg-slate-900">
      <p className="font-semibold">{formatTooltipDate(label)}</p>
      <p className="mt-1 text-emerald-700 dark:text-emerald-300">Actual Sales: {peso(row.actual)}</p>
      <p className="text-violet-700 dark:text-violet-300">Predicted Sales: {peso(row.predicted)}</p>
      <p className="mt-1 text-slate-600 dark:text-slate-300">Absolute Error: {peso(absoluteError)}</p>
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
  const unavailableMessage = data?.reason === "The selected validation period extends beyond the latest available sales data."
    ? "Historical accuracy is available only for dates with recorded actual sales. Future dates are shown in the Forecasted Sales chart."
    : data?.reason ?? "Not enough historical data to validate this period.";

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      <div className="mb-4">
        <h3 className="font-semibold">Historical Accuracy: Actual vs Predicted Sales</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Recorded sales compared with chronological out-of-sample Holt-Winters predictions during the selected period.
        </p>
      </div>
      {isLoading ? (
        <ChartSkeleton height="h-80" label="Loading Actual vs Forecasted Sales" />
      ) : isError ? (
        <ErrorState message="Unable to load the validation comparison." />
      ) : !data?.available || !validation.length ? (
        <EmptyState title={unavailableMessage} />
      ) : (
          <div className="h-80 text-slate-500 dark:text-slate-400">
          <ResponsiveContainer>
            <LineChart data={validation} margin={{ top: 6, right: 28, left: 8, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.14} />
              <XAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "currentColor", fontSize: 12 }}
                dataKey="date"
                tickFormatter={formatAxisDate}
                minTickGap={40}
                interval="preserveStartEnd"
                tickMargin={8}
                height={42}
                padding={{ left: 8, right: 16 }}
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
              <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />
              <Line
                name="Actual Sales"
                type="monotone"
                dataKey="actual"
                stroke="#047857"
                strokeWidth={3}
                dot={{ r: 3, fill: "#047857", stroke: "#047857", strokeWidth: 1 }}
                activeDot={{ r: 5, strokeWidth: 2 }}
              />
              <Line
                name="Predicted Sales"
                type="monotone"
                dataKey="predicted"
                stroke="#7c3aed"
                strokeWidth={3}
                strokeDasharray="7 5"
                dot={{ r: 3, fill: "#7c3aed", stroke: "#7c3aed", strokeWidth: 1 }}
                activeDot={{ r: 5, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}
