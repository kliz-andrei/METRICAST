/**
 * Returns the complementary, MAPE-based forecast accuracy indicator.
 *
 * This is deliberately derived only from validation MAPE. It is not an
 * independently measured accuracy statistic and must never use RMSE or
 * future forecast rows, which have no actual observations yet.
 */
export const forecastAccuracyFromMape = (mape: unknown): number | null => {
  if (typeof mape !== 'number' || !Number.isFinite(mape) || mape < 0) return null;
  return Math.max(0, 100 - mape);
};
