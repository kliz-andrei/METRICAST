export type DateRange = {
  startDate?: string;
  endDate?: string;
};

const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Accept only real calendar dates in the API's YYYY-MM-DD format.  Parsing
 * through UTC avoids a browser-local timezone changing the selected day.
 */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !calendarDatePattern.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function dateRangeError(range: DateRange): string | null {
  if (range.startDate && !isCalendarDate(range.startDate)) {
    return "Start date must be a valid calendar date.";
  }
  if (range.endDate && !isCalendarDate(range.endDate)) {
    return "End date must be a valid calendar date.";
  }
  if (range.startDate && range.endDate && range.startDate > range.endDate) {
    return "End date must be on or after the start date.";
  }
  return null;
}

/**
 * Keeps date filters safe before they become query parameters.  If a caller
 * proposes an invalid range, retain the last known-good range instead of
 * persisting a value that can break date formatting or downstream charts.
 */
export function sanitizeDateRange(
  proposed: DateRange,
  fallback: DateRange = {},
): DateRange {
  const range: DateRange = {
    startDate: proposed.startDate || undefined,
    endDate: proposed.endDate || undefined,
  };

  return dateRangeError(range) ? { ...fallback } : range;
}
