import { OperationalRepository, type OperationalFilters, type OperationalTimeBucket } from '../repositories/operational.repository.js';

export interface OperationalQuery {
  startDate?: string;
  endDate?: string;
  salesChannel?: string;
  orderType?: string;
}

const numberValue = (value: unknown): number => Number(value ?? 0);
const descendingTransactions = (left: OperationalTimeBucket, right: OperationalTimeBucket) => Number(right.transactionCount - left.transactionCount);
const ascendingTransactions = (left: OperationalTimeBucket, right: OperationalTimeBucket) => Number(left.transactionCount - right.transactionCount);
const parseStartDate = (value?: string): Date | undefined => value ? new Date(`${value}T00:00:00+08:00`) : undefined;
const parseEndDate = (value?: string): Date | undefined => value ? new Date(`${value}T23:59:59.999+08:00`) : undefined;

export class OperationalService {
  constructor(private readonly repository = new OperationalRepository()) {}

  async getAnalytics(query: OperationalQuery) {
    const filters: OperationalFilters = {
      startDate: parseStartDate(query.startDate),
      endDate: parseEndDate(query.endDate),
      salesChannel: query.salesChannel || undefined,
      orderType: query.orderType || undefined
    };
    const [summary, hourlyOperations, dailyOperations, paymentMethodDistribution, orderTypeDistribution, salesChannelDistribution] = await Promise.all([
      this.repository.summary(filters),
      this.repository.hourlyOperations(filters),
      this.repository.dailyOperations(filters),
      this.repository.paymentMethodDistribution(filters),
      this.repository.orderTypeDistribution(filters),
      this.repository.salesChannelDistribution(filters)
    ]);
    const peakHours = [...hourlyOperations].sort(descendingTransactions).slice(0, 10);
    const slowHours = [...hourlyOperations].sort(ascendingTransactions).slice(0, 10);
    const busiestDays = [...dailyOperations].sort(descendingTransactions).slice(0, 10);
    const slowestDays = [...dailyOperations].sort(ascendingTransactions).slice(0, 10);
    const peakOperatingHour = peakHours[0];
    const peakOperatingDay = [...dailyOperations].sort(descendingTransactions)[0];
    const totalTransactions = summary._count.id;
    const mapTimeBucket = (bucket: OperationalTimeBucket) => ({
      ...(bucket.hour === undefined ? { date: bucket.date } : { hour: bucket.hour }),
      transactionCount: numberValue(bucket.transactionCount),
      revenue: numberValue(bucket.revenue),
      guestCount: numberValue(bucket.guestCount)
    });

    const paymentMethods = new Map<string, { paymentMethod: string; transactionCount: number; revenue: number }>();

    for (const payment of paymentMethodDistribution) {
      const current = paymentMethods.get(payment.paymentMethod) ?? { paymentMethod: payment.paymentMethod, transactionCount: 0, revenue: 0 };
      current.transactionCount += 1;
      current.revenue += numberValue(payment._sum.amount);
      paymentMethods.set(payment.paymentMethod, current);
    }
    const paymentMethodSummary = {
      paymentMethods: paymentMethods.size,
      totalPaymentTransactions: new Set(paymentMethodDistribution.map((payment) => payment.transactionId)).size,
      totalRevenue: [...paymentMethods.values()].reduce((total, payment) => total + payment.revenue, 0)
    };

    return {
      summary: {
        totalTransactions,
        averageGuestsPerTransaction: numberValue(summary._avg.guestCount),
        averageRevenuePerTransaction: numberValue(summary._avg.netSales),
        peakOperatingHour: peakOperatingHour ? `${String(peakOperatingHour.hour).padStart(2, '0')}:00` : null,
        peakOperatingDay: peakOperatingDay?.date ?? null,
        averageDailyTransactions: dailyOperations.length === 0 ? 0 : totalTransactions / dailyOperations.length
      },
      hourlyOperations: hourlyOperations.map(mapTimeBucket),
      dailyOperations: dailyOperations.map(mapTimeBucket),
      hourlyTransactionDistribution: hourlyOperations.map((hour) => ({
        hour: hour.hour,
        transactionCount: numberValue(hour.transactionCount)
      })),
      dailyTransactionDistribution: dailyOperations.map((day) => ({
        date: day.date,
        transactionCount: numberValue(day.transactionCount)
      })),
      paymentMethodDistribution: [...paymentMethods.values()].sort((left, right) => left.paymentMethod.localeCompare(right.paymentMethod)),
      orderTypeDistribution: orderTypeDistribution.map((orderType) => ({
        orderType: orderType.orderType,
        transactionCount: orderType._count.id,
        revenue: numberValue(orderType._sum.netSales)
      })),
      salesChannelDistribution: salesChannelDistribution.map((salesChannel) => ({
        salesChannel: salesChannel.salesChannel,
        transactionCount: salesChannel._count.id,
        revenue: numberValue(salesChannel._sum.netSales)
      })),
      hourlyRevenue: hourlyOperations.map((hour) => ({
        hour: hour.hour,
        revenue: numberValue(hour.revenue)
      })),
      busiestHours: peakHours.map(mapTimeBucket),
      slowestHours: slowHours.map(mapTimeBucket),
      busiestDays: busiestDays.map(mapTimeBucket),
      slowestDays: slowestDays.map(mapTimeBucket),
      paymentMethodSummary,
      peakHours: peakHours.map(mapTimeBucket),
      slowHours: slowHours.map(mapTimeBucket)
    };
  }
}
