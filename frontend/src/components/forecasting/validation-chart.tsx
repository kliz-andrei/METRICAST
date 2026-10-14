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
const formatHeaderDate = (value?: string) => {
  const date = dateOnly(value);
  return date
    ? new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "2-digit",
        year: "numeric",
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
  const comparableValidation = validation.filter(
    (row) => Number.isFinite(row.actual) && Number.isFinite(row.predicted),
  );
  const validationErrors = comparableValidation.map((row) => ({
    ...row,
    absoluteError: Math.abs(row.actual - row.predicted),
  }));
  const closestPrediction = validationErrors.reduce<typeof validationErrors[number] | null>(
    (closest, row) => !closest || row.absoluteError < closest.absoluteError ? row : closest,
    null,
  );
  const largestDifference = validationErrors.reduce<typeof validationErrors[number] | null>(
    (largest, row) => !largest || row.absoluteError > largest.absoluteError ? row : largest,
    null,
  );
  const validationDates = validation.map((row) => row.date).filter(Boolean).sort();
  const validationStart = data?.validationPeriod?.start ?? validationDates.at(0);
  const validationEnd = data?.validationPeriod?.end ?? validationDates.at(-1);
  const validationRangeLabel = validationStart && validationEnd
    ? validationStart === validationEnd
      ? formatHeaderDate(validationStart)
      : `${formatHeaderDate(validationStart)} – ${formatHeaderDate(validationEnd)}`
    : null;
  const domain = validationYAxisDomain(validation.flatMap((row) => [row.actual, row.predicted]));
  const unavailableMessage = data?.reason === "The selected validation period extends beyond the latest available sales data."
    ? "Historical accuracy is available only for dates with recorded actual sales. Future dates are shown in the Forecasted Sales chart."
    : data?.reason ?? "Not enough historical data to validate this period.";

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      <div className="mb-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
          <h3 className="font-semibold">Actual vs Predicted Sales</h3>
          {validationRangeLabel && <p className="text-sm text-slate-500 dark:text-slate-400">{validationRangeLabel}</p>}
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          See how actual sales compare with expected sales for the selected dates.
        </p>
      </div>
      {isLoading ? (
        <ChartSkeleton height="h-80" label="Loading Actual vs Forecasted Sales" />
      ) : isError ? (
        <ErrorState message="Unable to load the validation comparison." />
      ) : !data?.available || !validation.length ? (
        <EmptyState title={unavailableMessage} />
      ) : (
        <>
        <div className="h-80 text-slate-500 dark:text-slate-400">
          <ResponsiveContainer>
            <LineChart data={validation} margin={{ top: 6, right: 28, left: 8, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
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
              <Tooltip
                content={<ValidationTooltip />}
                cursor={{ stroke: "#64748b", strokeOpacity: 0.45, strokeDasharray: "4 4" }}
                allowEscapeViewBox={{ x: true, y: true }}
              />
              <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />
              <Line
                name="Actual Sales"
                type="monotone"
                dataKey="actual"
                stroke="#047857"
                strokeWidth={3}
                dot={{ r: 2, fill: "#047857", stroke: "#047857", strokeWidth: 1 }}
                activeDot={{ r: 5, strokeWidth: 2 }}
              />
              <Line
                name="Predicted Sales"
                type="monotone"
                dataKey="predicted"
                stroke="#7c3aed"
                strokeWidth={3}
                strokeDasharray="7 5"
                dot={{ r: 2, fill: "#7c3aed", stroke: "#7c3aed", strokeWidth: 1 }}
                activeDot={{ r: 5, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {closestPrediction && largestDifference && (
          <div className="mt-3 border-t border-slate-200/80 pt-3 dark:border-slate-800">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Forecast Insight
            </h4>
            {closestPrediction.date === largestDifference.date ? (
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                One comparable validation date is available: <span className="font-medium text-slate-800 dark:text-slate-200">{formatHeaderDate(closestPrediction.date)}</span> with an absolute error of <span className="font-medium text-slate-800 dark:text-slate-200">{peso(closestPrediction.absoluteError)}</span>.
              </p>
            ) : (
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Predictions were closest on <span className="font-medium text-slate-800 dark:text-slate-200">{formatHeaderDate(closestPrediction.date)}</span> with an absolute error of <span className="font-medium text-slate-800 dark:text-slate-200">{peso(closestPrediction.absoluteError)}</span>. The largest difference occurred on <span className="font-medium text-slate-800 dark:text-slate-200">{formatHeaderDate(largestDifference.date)}</span> at <span className="font-medium text-slate-800 dark:text-slate-200">{peso(largestDifference.absoluteError)}</span>.
              </p>
            )}
          </div>
        )}
        </>
      )}
    </article>
  );
}
