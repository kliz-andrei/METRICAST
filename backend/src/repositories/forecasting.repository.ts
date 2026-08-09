import { Prisma, type ForecastGranularity } from '@prisma/client';
import { prisma } from '../database/client.js';

export interface ForecastFilters {
  modelName?: string;
  granularity?: ForecastGranularity;
  startDate?: Date;
  endDate?: Date;
}
export interface ProductForecastFilters extends ForecastFilters {
  salesChannel?: string;
  orderType?: string;
}
export interface ProductHistoryRow { productId: string; date: string; quantity: bigint; revenue: Prisma.Decimal; }
export interface CategoryHistoryRow { category: string; date: string; quantity: bigint; revenue: Prisma.Decimal; }
export interface ForecastAccuracyRow { modelName: string; granularity: string; mae: Prisma.Decimal | null; rmse: Prisma.Decimal | null; mape: Prisma.Decimal | null; sampleSize: bigint; }
export interface DailySalesRow { date: string; value: Prisma.Decimal; }

export class ForecastingRepository {
  private where(filters: ForecastFilters): Prisma.ForecastWhereInput {
    return {
      modelName: filters.modelName,
      granularity: filters.granularity,
      targetDate: { gte: filters.startDate, lte: filters.endDate }
    };
  }

  models() {
    return prisma.forecast.groupBy({
      by: ['modelName', 'granularity'],
      _count: { id: true },
      _max: { generatedAt: true, targetDate: true }
    });
  }

  history(filters: ForecastFilters, take: number) {
    return prisma.forecast.findMany({
      where: this.where(filters),
      orderBy: [{ generatedAt: 'desc' }, { targetDate: 'asc' }],
      take
    });
  }

  latestGeneration(filters: Pick<ForecastFilters, 'modelName' | 'granularity'>) {
    return prisma.forecast.findFirst({
      where: { modelName: filters.modelName, granularity: filters.granularity },
      orderBy: { generatedAt: 'desc' }
    });
  }

  latestGuestGeneration(granularity: ForecastGranularity) {
    return prisma.forecast.findFirst({
      where: { granularity, modelName: { contains: 'guest', mode: 'insensitive' } },
      orderBy: { generatedAt: 'desc' }
    });
  }

  latestTransactionGeneration(granularity: ForecastGranularity) {
    return prisma.forecast.findFirst({
      where: { granularity, modelName: { contains: 'transaction', mode: 'insensitive' } },
      orderBy: { generatedAt: 'desc' }
    });
  }

  forecastsForGeneration(modelName: string, granularity: ForecastGranularity, generatedAt: Date) {
    return prisma.forecast.findMany({
      where: { modelName, granularity, generatedAt },
      orderBy: { targetDate: 'asc' }
    });
  }

  topProducts(filters: ProductForecastFilters, take: number) {
    return prisma.transactionItem.groupBy({ by: ['productId'], where: { transaction: { is: { deletedAt: null, occurredAt: { gte: filters.startDate, lte: filters.endDate }, salesChannel: filters.salesChannel, orderType: filters.orderType } } }, _sum: { quantity: true, salesAmount: true }, orderBy: { _sum: { salesAmount: 'desc' } }, take });
  }

  productDetails(ids: string[]) { return prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, category: { select: { name: true } } } }); }

  async productHistory(ids: string[], filters: ProductForecastFilters): Promise<ProductHistoryRow[]> {
    if (ids.length === 0) return [];
    const conditions = [Prisma.sql`t."deletedAt" IS NULL`, Prisma.sql`ti."productId" IN (${Prisma.join(ids)})`];
    if (filters.startDate) conditions.push(Prisma.sql`t."occurredAt" >= ${filters.startDate}`);
    if (filters.endDate) conditions.push(Prisma.sql`t."occurredAt" <= ${filters.endDate}`);
    if (filters.salesChannel) conditions.push(Prisma.sql`t."salesChannel" = ${filters.salesChannel}`);
    if (filters.orderType) conditions.push(Prisma.sql`t."orderType" = ${filters.orderType}`);
    return prisma.$queryRaw<ProductHistoryRow[]>`SELECT ti."productId" AS "productId", TO_CHAR(t."occurredAt", 'YYYY-MM-DD') AS date, SUM(ti.quantity) AS quantity, SUM(ti."salesAmount") AS revenue FROM transaction_items ti INNER JOIN transactions t ON t.id = ti."transactionId" WHERE ${Prisma.join(conditions, ' AND ')} GROUP BY ti."productId", date ORDER BY date ASC`;
  }

  productForecasts(filters: ProductForecastFilters) { return prisma.forecast.findMany({ where: { modelName: { contains: 'product', mode: 'insensitive' }, targetDate: { gte: filters.startDate, lte: filters.endDate } }, orderBy: [{ generatedAt: 'desc' }, { targetDate: 'asc' }] }); }

  categoryHistory(filters: ProductForecastFilters): Promise<CategoryHistoryRow[]> {
    const conditions = [Prisma.sql`t."deletedAt" IS NULL`];
    if (filters.startDate) conditions.push(Prisma.sql`t."occurredAt" >= ${filters.startDate}`);
    if (filters.endDate) conditions.push(Prisma.sql`t."occurredAt" <= ${filters.endDate}`);
    if (filters.salesChannel) conditions.push(Prisma.sql`t."salesChannel" = ${filters.salesChannel}`);
    if (filters.orderType) conditions.push(Prisma.sql`t."orderType" = ${filters.orderType}`);
    return prisma.$queryRaw<CategoryHistoryRow[]>`SELECT c.name AS category, TO_CHAR(t."occurredAt", 'YYYY-MM-DD') AS date, SUM(ti.quantity) AS quantity, SUM(ti."salesAmount") AS revenue FROM transaction_items ti INNER JOIN transactions t ON t.id = ti."transactionId" INNER JOIN products p ON p.id = ti."productId" INNER JOIN categories c ON c.id = p."categoryId" WHERE ${Prisma.join(conditions, ' AND ')} GROUP BY c.name, date ORDER BY date ASC`;
  }

  categoryForecasts(filters: ProductForecastFilters) { return prisma.forecast.findMany({ where: { modelName: { contains: 'category', mode: 'insensitive' }, targetDate: { gte: filters.startDate, lte: filters.endDate } }, orderBy: [{ generatedAt: 'desc' }, { targetDate: 'asc' }] }); }

  accuracy(): Promise<ForecastAccuracyRow[]> {
    return prisma.$queryRaw<ForecastAccuracyRow[]>`SELECT "modelName" AS "modelName", granularity::text AS granularity, AVG(ABS(predicted - actual)) AS mae, SQRT(AVG(POWER(predicted - actual, 2))) AS rmse, AVG(ABS((predicted - actual) / NULLIF(actual, 0))) * 100 AS mape, COUNT(*) AS "sampleSize" FROM forecasts WHERE actual IS NOT NULL GROUP BY "modelName", granularity ORDER BY "modelName" ASC, granularity ASC`;
  }

  dailyNetSales(): Promise<DailySalesRow[]> { return prisma.$queryRaw<DailySalesRow[]>`SELECT TO_CHAR("occurredAt", 'YYYY-MM-DD') AS date, SUM("netSales") AS value FROM transactions WHERE "deletedAt" IS NULL GROUP BY date ORDER BY date ASC`; }
  dailyTransactionVolume(): Promise<DailySalesRow[]> { return prisma.$queryRaw<DailySalesRow[]>`SELECT TO_CHAR("occurredAt", 'YYYY-MM-DD') AS date, COUNT(*)::numeric AS value FROM transactions WHERE "deletedAt" IS NULL GROUP BY date ORDER BY date ASC`; }
  dailyGuestCount(): Promise<DailySalesRow[]> { return prisma.$queryRaw<DailySalesRow[]>`SELECT TO_CHAR("occurredAt", 'YYYY-MM-DD') AS date, SUM(COALESCE("guestCount", 0)) AS value FROM transactions WHERE "deletedAt" IS NULL GROUP BY date ORDER BY date ASC`; }
}
