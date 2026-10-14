const numberValue = (value: unknown) => Number(value ?? 0);

/**
 * Matches the Dashboard guest denominator: the rounded product of the
 * recorded average guest count and all qualifying transactions.
 */
export const revenuePerGuest = (netSales: unknown, averageGuests: unknown, totalTransactions: number) => {
  const guestsServed = Math.round(numberValue(averageGuests) * totalTransactions);
  return guestsServed > 0 ? numberValue(netSales) / guestsServed : undefined;
};
