export type DateRange = {
  startDate?: string;
  endDate?: string;
};

/** Returns the immediately preceding inclusive date range with the same duration. */
export const previousPeriod = (range: DateRange): Required<DateRange> | undefined => {
  if (!range.startDate || !range.endDate) return undefined;

  const start = new Date(`${range.startDate}T00:00:00Z`);
  const end = new Date(`${range.endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return undefined;

  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const previousEnd = new Date(start);
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setUTCDate(previousStart.getUTCDate() - days + 1);

  return {
    startDate: previousStart.toISOString().slice(0, 10),
    endDate: previousEnd.toISOString().slice(0, 10),
  };
};

export const percentChange = (current: number, previous: number) =>
  Number.isFinite(current) && Number.isFinite(previous) && previous !== 0
    ? ((current - previous) / Math.abs(previous)) * 100
    : undefined;
