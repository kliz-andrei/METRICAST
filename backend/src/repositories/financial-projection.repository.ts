import { Prisma } from '@prisma/client';
import { prisma } from '../database/client.js';

export interface FinancialProjectionFilters {
  startDate?: Date;
  endDate?: Date;
  salesChannel?: string;
  salesChannels?: string[];
  orderType?: string;
}

export interface CostCoverageRow {
  soldProducts: bigint;
  configuredProducts: bigint;
  missingProducts: bigint;
  soldItems: bigint;
  configuredItems: bigint;
  missingItems: bigint;
  configuredQuantity: bigint | null;
  missingQuantity: bigint | null;
  configuredProductCost: Prisma.Decimal | null;
}

export class FinancialProjectionRepository {
  private transactionWhere(filters: FinancialProjectionFilters): Prisma.TransactionWhereInput {
    return {
      deletedAt: null,
      occurredAt: { gte: filters.startDate, lte: filters.endDate },
      salesChannel: filters.salesChannels?.length ? { in: filters.salesChannels } : filters.salesChannel,
      orderType: filters.orderType,
    };
  }

  private conditions(filters: FinancialProjectionFilters): Prisma.Sql[] {
    const conditions = [Prisma.sql`t."deletedAt" IS NULL`];
    if (filters.startDate) conditions.push(Prisma.sql`t."occurredAt" >= ${filters.startDate}`);
    if (filters.endDate) conditions.push(Prisma.sql`t."occurredAt" <= ${filters.endDate}`);
    if (filters.salesChannels?.length) conditions.push(Prisma.sql`t."salesChannel" IN (${Prisma.join(filters.salesChannels)})`);
    else if (filters.salesChannel) conditions.push(Prisma.sql`t."salesChannel" = ${filters.salesChannel}`);
    if (filters.orderType) conditions.push(Prisma.sql`t."orderType" = ${filters.orderType}`);
    return conditions;
  }

  historicalNetSales(filters: FinancialProjectionFilters) {
    return prisma.transaction.aggregate({
      where: this.transactionWhere(filters),
      _sum: { netSales: true },
      _count: { id: true },
    });
  }

  costCoverage(filters: FinancialProjectionFilters): Promise<CostCoverageRow[]> {
    return prisma.$queryRaw<CostCoverageRow[]>`
      SELECT
        COUNT(DISTINCT ti."productId") AS "soldProducts",
        COUNT(DISTINCT ti."productId") FILTER (WHERE p."unitCost" IS NOT NULL) AS "configuredProducts",
        COUNT(DISTINCT ti."productId") FILTER (WHERE p."unitCost" IS NULL) AS "missingProducts",
        COUNT(*) AS "soldItems",
        COUNT(*) FILTER (WHERE p."unitCost" IS NOT NULL) AS "configuredItems",
        COUNT(*) FILTER (WHERE p."unitCost" IS NULL) AS "missingItems",
        SUM(ti.quantity) FILTER (WHERE p."unitCost" IS NOT NULL) AS "configuredQuantity",
        SUM(ti.quantity) FILTER (WHERE p."unitCost" IS NULL) AS "missingQuantity",
        SUM(ti.quantity * p."unitCost") FILTER (WHERE p."unitCost" IS NOT NULL) AS "configuredProductCost"
      FROM transaction_items AS ti
      INNER JOIN transactions AS t ON t.id = ti."transactionId"
      INNER JOIN products AS p ON p.id = ti."productId"
      WHERE ${Prisma.join(this.conditions(filters), ' AND ')}
    `;
  }

  settings() {
    return prisma.financialSetting.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
  }

  updateSettings(overheadRate: number) {
    return prisma.financialSetting.update({
      where: { id: 'default' },
      data: { overheadRate },
    });
  }

  products() {
    return prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        sku: true,
        unitCost: true,
        category: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  updateProductCost(id: string, unitCost: number | null) {
    return prisma.product.update({
      where: { id },
      data: { unitCost },
      select: {
        id: true,
        name: true,
        sku: true,
        unitCost: true,
        category: { select: { name: true } },
      },
    });
  }
}
