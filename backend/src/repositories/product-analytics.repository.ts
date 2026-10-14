import { Prisma } from '@prisma/client';
import { prisma } from '../database/client.js';

export interface ProductAnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  salesChannel?: string;
  salesChannels?: string[];
  orderType?: string;
}

export interface DailyProductRevenue {
  date: string;
  revenue: Prisma.Decimal;
}

export interface DailyProductRevenueByProduct extends DailyProductRevenue {
  productId: string;
}

export class ProductAnalyticsRepository {
  private transactionWhere(filters: ProductAnalyticsFilters): Prisma.TransactionWhereInput {
    return {
      deletedAt: null,
      occurredAt: { gte: filters.startDate, lte: filters.endDate },
      salesChannel: filters.salesChannels?.length ? { in: filters.salesChannels } : filters.salesChannel,
      orderType: filters.orderType
    };
  }

  private itemWhere(filters: ProductAnalyticsFilters): Prisma.TransactionItemWhereInput {
    return { transaction: { is: this.transactionWhere(filters) } };
  }

  summary(filters: ProductAnalyticsFilters) {
    return prisma.transactionItem.aggregate({
      where: this.itemWhere(filters),
      _sum: { quantity: true, salesAmount: true }
    });
  }

  productMetrics(filters: ProductAnalyticsFilters) {
    return prisma.transactionItem.groupBy({
      by: ['productId'],
      where: this.itemWhere(filters),
      _sum: { quantity: true, salesAmount: true }
    });
  }

  productDetails(ids: string[]) {
    return prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, category: { select: { name: true } } }
    });
  }

  private conditions(filters: ProductAnalyticsFilters): Prisma.Sql[] {
    const conditions = [Prisma.sql`t."deletedAt" IS NULL`];

    if (filters.startDate) conditions.push(Prisma.sql`t."occurredAt" >= ${filters.startDate}`);
    if (filters.endDate) conditions.push(Prisma.sql`t."occurredAt" <= ${filters.endDate}`);
    if (filters.salesChannels?.length) conditions.push(Prisma.sql`t."salesChannel" IN (${Prisma.join(filters.salesChannels)})`);
    else if (filters.salesChannel) conditions.push(Prisma.sql`t."salesChannel" = ${filters.salesChannel}`);
    if (filters.orderType) conditions.push(Prisma.sql`t."orderType" = ${filters.orderType}`);

    return conditions;
  }

  dailyRevenue(filters: ProductAnalyticsFilters): Promise<DailyProductRevenue[]> {
    return prisma.$queryRaw<DailyProductRevenue[]>`
      SELECT
        TO_CHAR(t."occurredAt" AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD') AS date,
        SUM(ti."salesAmount") AS revenue
      FROM transaction_items AS ti
      INNER JOIN transactions AS t ON t.id = ti."transactionId"
      WHERE ${Prisma.join(this.conditions(filters), ' AND ')}
      GROUP BY date
      ORDER BY date ASC
    `;
  }

  async dailyRevenueByProduct(
    filters: ProductAnalyticsFilters,
    productIds: string[],
  ): Promise<DailyProductRevenueByProduct[]> {
    if (!productIds.length) return [];

    return prisma.$queryRaw<DailyProductRevenueByProduct[]>`
      SELECT
        TO_CHAR(t."occurredAt" AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD') AS date,
        ti."productId" AS "productId",
        SUM(ti."salesAmount") AS revenue
      FROM transaction_items AS ti
      INNER JOIN transactions AS t ON t.id = ti."transactionId"
      WHERE ${Prisma.join(this.conditions(filters), ' AND ')}
        AND ti."productId" IN (${Prisma.join(
          productIds.map((productId) => Prisma.sql`CAST(${productId} AS uuid)`),
        )})
      GROUP BY date, ti."productId"
      ORDER BY date ASC, ti."productId" ASC
    `;
  }
}
