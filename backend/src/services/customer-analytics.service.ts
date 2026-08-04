import { CustomerAnalyticsRepository, type CustomerAnalyticsFilters } from '../repositories/customer-analytics.repository.js';

export interface CustomerAnalyticsQuery {
  startDate?: string;
  endDate?: string;
  salesChannel?: string;
  orderType?: string;
}

const numberValue = (value: unknown): number => Number(value ?? 0);
const guestDescending = <T extends { guests: bigint }>(left: T, right: T): number => Number(right.guests - left.guests);
const guestAscending = <T extends { guests: bigint }>(left: T, right: T): number => Number(left.guests - right.guests);

const parseStartDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00+08:00`);
};

const parseEndDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  return new Date(`${value}T23:59:59.999+08:00`);
};

export class CustomerAnalyticsService {
  constructor(private readonly repository = new CustomerAnalyticsRepository()) {}

  async getAnalytics(query: CustomerAnalyticsQuery) {
    const filters: CustomerAnalyticsFilters = {
      startDate: parseStartDate(query.startDate),
      endDate: parseEndDate(query.endDate),
      salesChannel: query.salesChannel || undefined,
      orderType: query.orderType || undefined
    };
    const [summary, guestDays, guestMonths, guestDistribution, diningHours, orderTypeDistribution, salesChannelDistribution] = await Promise.all([
      this.repository.summary(filters),
      this.repository.guestDays(filters),
      this.repository.guestMonths(filters),
      this.repository.guestDistribution(filters),
      this.repository.diningHours(filters),
      this.repository.orderTypeDistribution(filters),
      this.repository.salesChannelDistribution(filters)
    ]);

    const totalGuestsServed = numberValue(summary._sum.guestCount);
    const totalTransactions = summary._count.id;
    const highestGuestDays = [...guestDays].sort(guestDescending).slice(0, 10);
    const lowestGuestDays = [...guestDays].sort(guestAscending).slice(0, 10);
    const peakDiningHours = [...diningHours].sort(guestDescending).slice(0, 10);
    const slowDiningHours = [...diningHours].sort(guestAscending).slice(0, 10);
    const peakDiningHour = peakDiningHours[0];
    const peakDiningDay = highestGuestDays[0];

    return {
      summary: {
        totalGuestsServed,
        averageGuestsPerTransaction: numberValue(summary._avg.guestCount),
        averageSpendPerGuest: totalGuestsServed === 0 ? 0 : numberValue(summary._sum.netSales) / totalGuestsServed,
        averageTransactionsPerDay: guestDays.length === 0 ? 0 : totalTransactions / guestDays.length,
        peakDiningHour: peakDiningHour ? `${String(peakDiningHour.hour).padStart(2, '0')}:00` : null,
        peakDiningDay: peakDiningDay?.date ?? null
      },
      guestsPerDay: guestDays.map((day) => ({
        date: day.date,
        guests: numberValue(day.guests),
        transactions: numberValue(day.transactions)
      })),
      guestsPerMonth: guestMonths.map((month) => ({
        month: month.month,
        guests: numberValue(month.guests),
        transactions: numberValue(month.transactions)
      })),
      guestDistribution: guestDistribution.map((bucket) => ({
        guestCount: bucket.guestCount ?? 0,
        transactions: bucket._count.id
      })),
      diningHourHeatmap: diningHours.map((hour) => ({
        hour: hour.hour,
        guests: numberValue(hour.guests),
        transactions: numberValue(hour.transactions)
      })),
      orderTypeDistribution: orderTypeDistribution.map((orderType) => ({
        orderType: orderType.orderType,
        guests: numberValue(orderType._sum.guestCount),
        transactions: orderType._count.id
      })),
      salesChannelDistribution: salesChannelDistribution.map((salesChannel) => ({
        salesChannel: salesChannel.salesChannel,
        guests: numberValue(salesChannel._sum.guestCount),
        transactions: salesChannel._count.id
      })),
      highestGuestDays: highestGuestDays.map((day) => ({
        date: day.date,
        guests: numberValue(day.guests),
        transactions: numberValue(day.transactions)
      })),
      lowestGuestDays: lowestGuestDays.map((day) => ({
        date: day.date,
        guests: numberValue(day.guests),
        transactions: numberValue(day.transactions)
      })),
      peakDiningHours: peakDiningHours.map((hour) => ({
        hour: hour.hour,
        guests: numberValue(hour.guests),
        transactions: numberValue(hour.transactions)
      })),
      slowDiningHours: slowDiningHours.map((hour) => ({
        hour: hour.hour,
        guests: numberValue(hour.guests),
        transactions: numberValue(hour.transactions)
      }))
    };
  }
}
