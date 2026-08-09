import type { Prisma } from '@prisma/client';
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
