import { Prisma } from '@prisma/client';
import { prisma } from '../database/client.js';

export type SalesFilter = {
  startDate?: string;
  endDate?: string;
  salesChannel?: string;
  salesChannels?: string[];
  orderType?: string;
};

export const salesWhere = (filters: SalesFilter): Prisma.TransactionWhereInput => ({
  deletedAt: null,
  occurredAt: {
    gte: filters.startDate
      ? new Date(`${filters.startDate}T00:00:00+08:00`)
      : undefined,
    lte: filters.endDate
      ? new Date(`${filters.endDate}T23:59:59.999+08:00`)
      : undefined,
  },
  salesChannel: filters.salesChannels?.length ? { in: filters.salesChannels } : filters.salesChannel,
  orderType: filters.orderType,
});

export class SalesAnalyticsRepository {
  async weekdayAnalysis(filters: SalesFilter) {
    const localDate = Prisma.sql`("occurredAt" AT TIME ZONE 'Asia/Manila')::date`;
    const conditions = [Prisma.sql`"deletedAt" IS NULL`];
    if (filters.startDate) conditions.push(Prisma.sql`${localDate} >= ${filters.startDate}::date`);
    if (filters.endDate) conditions.push(Prisma.sql`${localDate} <= ${filters.endDate}::date`);
    if (filters.salesChannels?.length) conditions.push(Prisma.sql`"salesChannel" IN (${Prisma.join(filters.salesChannels)})`);
    else if (filters.salesChannel) conditions.push(Prisma.sql`"salesChannel" = ${filters.salesChannel}`);
    if (filters.orderType) conditions.push(Prisma.sql`"orderType" = ${filters.orderType}`);
    const base = Prisma.join(conditions, ' AND ');
    const bounds = await prisma.$queryRaw<Array<{ start: Date | null; end: Date | null }>>`SELECT MIN(${localDate}) AS start, MAX(${localDate}) AS end FROM transactions WHERE "deletedAt" IS NULL`;
    if (!bounds[0]?.start || !bounds[0]?.end) return [];
    return prisma.$queryRaw<Array<{ weekday: number; totalSales: Prisma.Decimal | null; transactions: bigint; guests: Prisma.Decimal | null; occurrences: bigint }>>`
      WITH calendar AS (SELECT day::date AS day, EXTRACT(ISODOW FROM day)::int AS weekday FROM generate_series(${filters.startDate ?? bounds[0].start}::date, ${filters.endDate ?? bounds[0].end}::date, interval '1 day') day),
      totals AS (SELECT EXTRACT(ISODOW FROM ${localDate})::int AS weekday, SUM("netSales") AS "totalSales", COUNT(*) AS transactions, SUM(COALESCE("guestCount", 0)) AS guests FROM transactions WHERE ${base} GROUP BY weekday)
      SELECT calendar.weekday, COALESCE(totals."totalSales", 0) AS "totalSales", COALESCE(totals.transactions, 0) AS transactions, COALESCE(totals.guests, 0) AS guests, COUNT(calendar.day) AS occurrences FROM calendar LEFT JOIN totals ON totals.weekday = calendar.weekday GROUP BY calendar.weekday, totals."totalSales", totals.transactions, totals.guests ORDER BY calendar.weekday`;
  }
  discountDistribution(filters: SalesFilter) {
    return prisma.transaction.groupBy({
      by: ['discountType'],
      where: {
        ...salesWhere(filters),
        discountType: { not: null },
        discountAmount: { gt: 0 },
      },
      _sum: { discountAmount: true },
      _count: { id: true },
      orderBy: { _sum: { discountAmount: 'desc' } },
    });
  }
}
