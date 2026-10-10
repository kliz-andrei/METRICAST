export type TimeGranularity = "daily" | "weekly" | "monthly";

type DatedRow = { date: string } & Record<string, unknown>;

const dayMilliseconds = 24 * 60 * 60 * 1000;

export function getTimeGranularity(rows: Array<{ date: string }>): TimeGranularity {
  if (rows.length <= 45) return "daily";

  const dates = rows
    .map((row) => Date.parse(`${row.date}T00:00:00Z`))
    .filter(Number.isFinite);
  if (dates.length < 2) return "daily";

  const spanDays = (Math.max(...dates) - Math.min(...dates)) / dayMilliseconds + 1;
  if (spanDays <= 180) return "weekly";
  return "monthly";
}

function periodStart(date: string, granularity: TimeGranularity) {
  if (granularity === "daily") return date;
  const value = new Date(`${date}T00:00:00Z`);
  if (granularity === "monthly") {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-01`;
  }

  const day = value.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  value.setUTCDate(value.getUTCDate() + mondayOffset);
  return value.toISOString().slice(0, 10);
}

/** Aggregates only the values already visible in a chart; source API data remains unchanged. */
export function aggregateDatedSeries<T extends DatedRow>(
  rows: T[],
  sumKeys: Array<keyof T>,
  granularity = getTimeGranularity(rows),
): T[] {
  if (granularity === "daily") return rows;

  const grouped = new Map<string, T>();
  for (const row of rows) {
    const date = periodStart(row.date, granularity);
    const current = grouped.get(date);
    if (!current) {
      grouped.set(date, { ...row, date });
      continue;
    }
    for (const key of sumKeys) {
      const currentValue = Number(current[key] ?? 0);
      const nextValue = Number(row[key] ?? 0);
      current[key] = (currentValue + nextValue) as T[keyof T];
    }
  }

  return [...grouped.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function getYAxisDomain(values: number[]): [number, number] {
  const finiteValues = values.filter(Number.isFinite);
  if (!finiteValues.length) return [0, 1];

  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);
  const span = max - min;
  const padding = Math.max(span * 0.08, Math.max(Math.abs(max), Math.abs(min), 1) * 0.04, 1);
  const lower = Math.max(0, min - padding);
  const upper = max + padding;

  return lower === upper ? [Math.max(0, lower - 1), upper + 1] : [lower, upper];
}

export function formatTimePeriod(date: string, granularity: TimeGranularity, long = false) {
  const value = new Date(`${date}T00:00:00Z`);
  if (granularity === "monthly") {
    return new Intl.DateTimeFormat("en-PH", { month: long ? "long" : "short", year: "numeric" }).format(value);
  }
  const formatted = new Intl.DateTimeFormat("en-PH", {
    month: long ? "long" : "short",
    day: "numeric",
    ...(long ? { year: "numeric" as const } : {}),
  }).format(value);
  return granularity === "weekly" ? `Week of ${formatted}` : formatted;
}

export const granularityLabel = (granularity: TimeGranularity) =>
  granularity.charAt(0).toUpperCase() + granularity.slice(1);
