export const UTB_OPERATING_HOURS = {
  openTime: "10:00",
  closeTime: "00:00",
  hoursPerDay: 14,
} as const;

export type DateRange = {
  startDate?: string;
  endDate?: string;
};

const MILLISECONDS_PER_DAY = 86_400_000;

function calendarDayCount(range: DateRange): number | undefined {
  if (!range.startDate || !range.endDate) return undefined;

  const start = new Date(`${range.startDate}T00:00:00Z`);
  const end = new Date(`${range.endDate}T00:00:00Z`);
  const difference = end.getTime() - start.getTime();

  if (Number.isNaN(difference) || difference < 0) return undefined;
  return Math.floor(difference / MILLISECONDS_PER_DAY) + 1;
}

/**
 * Returns the operating hours in the selected scope using Under the Balete's
 * verified 10:00 AM–12:00 AM schedule. For an unbounded (All) scope, only
 * dates represented by the imported daily data are counted.
 */
export function operatingHoursForRange(
  range: DateRange,
  importedDailyRows: Array<{ date?: string }> = [],
): number | undefined {
  const boundedDays = calendarDayCount(range);
  if (boundedDays !== undefined) {
    return boundedDays * UTB_OPERATING_HOURS.hoursPerDay;
  }

  if (range.startDate || range.endDate) return undefined;

  const importedDays = new Set(
    importedDailyRows
      .map((row) => row.date)
      .filter((date): date is string => Boolean(date)),
  ).size;

  return importedDays > 0
    ? importedDays * UTB_OPERATING_HOURS.hoursPerDay
    : undefined;
}
