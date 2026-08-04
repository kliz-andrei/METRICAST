import { Prisma } from '@prisma/client';
import { prisma } from '../database/client.js';

export interface OperationalFilters {
  startDate?: Date;
  endDate?: Date;
  salesChannel?: string;
  orderType?: string;
}

export interface OperationalTimeBucket {
  hour?: number;
  date?: string;
  transactionCount: bigint;
  revenue: Prisma.Decimal;
  guestCount: bigint;
}

export class OperationalRepository {
  private transactionWhere(filters: OperationalFilters): Prisma.TransactionWhereInput {
    return {
      deletedAt: null,
      occurredAt: { gte: filters.startDate, lte: filters.endDate },
      salesChannel: filters.salesChannel,
      orderType: filters.orderType
    };
  }

  summary(filters: OperationalFilters) {
    return prisma.transaction.aggregate({
      where: this.transactionWhere(filters),
      _avg: { guestCount: true, netSales: true },
      _count: { id: true }
    });
  }

  orderTypeDistribution(filters: OperationalFilters) {
    return prisma.transaction.groupBy({
      by: ['orderType'],
      where: this.transactionWhere(filters),
      _sum: { netSales: true },
      _count: { id: true },
      orderBy: { orderType: 'asc' }
    });
  }

  salesChannelDistribution(filters: OperationalFilters) {
    return prisma.transaction.groupBy({
      by: ['salesChannel'],
      where: this.transactionWhere(filters),
      _sum: { netSales: true },
      _count: { id: true },
      orderBy: { salesChannel: 'asc' }
    });
  }

  paymentMethodDistribution(filters: OperationalFilters) {
    return prisma.payment.groupBy({
      by: ['paymentMethod', 'transactionId'],
      where: { transaction: { is: this.transactionWhere(filters) } },
      _sum: { amount: true }
    });
  }

  private conditions(filters: OperationalFilters): Prisma.Sql[] {
    const conditions = [Prisma.sql`"deletedAt" IS NULL`];

    if (filters.startDate) conditions.push(Prisma.sql`"occurredAt" >= ${filters.startDate}`);
    if (filters.endDate) conditions.push(Prisma.sql`"occurredAt" <= ${filters.endDate}`);
    if (filters.salesChannel) conditions.push(Prisma.sql`"salesChannel" = ${filters.salesChannel}`);
    if (filters.orderType) conditions.push(Prisma.sql`"orderType" = ${filters.orderType}`);

    return conditions;
  }

  hourlyOperations(filters: OperationalFilters): Promise<OperationalTimeBucket[]> {
    return prisma.$queryRaw<OperationalTimeBucket[]>`
      SELECT
        EXTRACT(HOUR FROM "occurredAt")::integer AS hour,
        COUNT(*) AS "transactionCount",
        SUM("netSales") AS revenue,
        SUM(COALESCE("guestCount", 0)) AS "guestCount"
      FROM transactions
      WHERE ${Prisma.join(this.conditions(filters), ' AND ')}
      GROUP BY hour
      ORDER BY hour ASC
    `;
  }

  dailyOperations(filters: OperationalFilters): Promise<OperationalTimeBucket[]> {
    return prisma.$queryRaw<OperationalTimeBucket[]>`
      SELECT
        TO_CHAR("occurredAt", 'YYYY-MM-DD') AS date,
        COUNT(*) AS "transactionCount",
        SUM("netSales") AS revenue,
        SUM(COALESCE("guestCount", 0)) AS "guestCount"
      FROM transactions
      WHERE ${Prisma.join(this.conditions(filters), ' AND ')}
      GROUP BY date
      ORDER BY date ASC
    `;
  }
}
