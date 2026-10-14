import { Prisma } from '@prisma/client';
import { prisma } from '../database/client.js';

export interface CustomerAnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  salesChannel?: string;
  orderType?: string;
}

export interface GuestDayAggregate {
  date: string;
  guests: bigint;
  transactions: bigint;
}

export interface DiningHourAggregate {
  hour: number;
  guests: bigint;
  transactions: bigint;
}

export interface GuestMonthAggregate {
  month: string;
  guests: bigint;
  transactions: bigint;
}

export class CustomerAnalyticsRepository {
  private transactionWhere(filters: CustomerAnalyticsFilters): Prisma.TransactionWhereInput {
    return {
      deletedAt: null,
      occurredAt: {
        gte: filters.startDate,
        lte: filters.endDate
      },
      salesChannel: filters.salesChannel,
      orderType: filters.orderType
    };
  }

  summary(filters: CustomerAnalyticsFilters) {
    return prisma.transaction.aggregate({
      where: this.transactionWhere(filters),
      _sum: { netSales: true },
      _avg: { guestCount: true },
      _count: { id: true }
    });
  }

  private eligibleGuestWhere(filters: CustomerAnalyticsFilters): Prisma.TransactionWhereInput {
    return {
      ...this.transactionWhere(filters),
      guestCount: { gt: 0 }
    };
  }

  guestSummary(filters: CustomerAnalyticsFilters) {
    return prisma.transaction.aggregate({
      where: this.eligibleGuestWhere(filters),
      _sum: { guestCount: true, netSales: true },
      _count: { id: true }
    });
  }

  guestDistribution(filters: CustomerAnalyticsFilters) {
    return prisma.transaction.groupBy({
      by: ['guestCount'],
      where: {
        ...this.eligibleGuestWhere(filters)
      },
      _count: { id: true },
      orderBy: { guestCount: 'asc' }
    });
  }

  orderTypeDistribution(filters: CustomerAnalyticsFilters) {
    return prisma.transaction.groupBy({
      by: ['orderType'],
      where: this.eligibleGuestWhere(filters),
      _sum: { guestCount: true },
      _count: { id: true },
      orderBy: { orderType: 'asc' }
    });
  }

  salesChannelDistribution(filters: CustomerAnalyticsFilters) {
    return prisma.transaction.groupBy({
      by: ['salesChannel'],
      where: this.eligibleGuestWhere(filters),
      _sum: { guestCount: true },
      _count: { id: true },
      orderBy: { salesChannel: 'asc' }
    });
  }

  private conditions(filters: CustomerAnalyticsFilters): Prisma.Sql[] {
    const conditions = [Prisma.sql`"deletedAt" IS NULL`];

    if (filters.startDate) conditions.push(Prisma.sql`"occurredAt" >= ${filters.startDate}`);
    if (filters.endDate) conditions.push(Prisma.sql`"occurredAt" <= ${filters.endDate}`);
    if (filters.salesChannel) conditions.push(Prisma.sql`"salesChannel" = ${filters.salesChannel}`);
    if (filters.orderType) conditions.push(Prisma.sql`"orderType" = ${filters.orderType}`);

    return conditions;
  }

  private eligibleGuestConditions(filters: CustomerAnalyticsFilters): Prisma.Sql[] {
    return [...this.conditions(filters), Prisma.sql`"guestCount" > 0`];
  }

  async guestDays(filters: CustomerAnalyticsFilters): Promise<GuestDayAggregate[]> {
    return prisma.$queryRaw<GuestDayAggregate[]>`
      SELECT
        TO_CHAR("occurredAt", 'YYYY-MM-DD') AS date,
        SUM(COALESCE("guestCount", 0)) AS guests,
        COUNT(*) AS transactions
      FROM transactions
      WHERE ${Prisma.join(this.eligibleGuestConditions(filters), ' AND ')}
      GROUP BY date
      ORDER BY date ASC
    `;
  }

  async guestMonths(filters: CustomerAnalyticsFilters): Promise<GuestMonthAggregate[]> {
    return prisma.$queryRaw<GuestMonthAggregate[]>`
      SELECT
        TO_CHAR("occurredAt", 'YYYY-MM') AS month,
        SUM(COALESCE("guestCount", 0)) AS guests,
        COUNT(*) AS transactions
      FROM transactions
      WHERE ${Prisma.join(this.eligibleGuestConditions(filters), ' AND ')}
      GROUP BY month
      ORDER BY month ASC
    `;
  }

  async diningHours(filters: CustomerAnalyticsFilters): Promise<DiningHourAggregate[]> {
    return prisma.$queryRaw<DiningHourAggregate[]>`
      SELECT
        EXTRACT(HOUR FROM ("occurredAt" AT TIME ZONE 'Asia/Manila'))::integer AS hour,
        SUM(COALESCE("guestCount", 0)) AS guests,
        COUNT(*) AS transactions
      FROM transactions
      WHERE ${Prisma.join(this.eligibleGuestConditions(filters), ' AND ')}
      GROUP BY hour
      ORDER BY hour ASC
    `;
  }
}
