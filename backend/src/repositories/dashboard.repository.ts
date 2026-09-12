import { prisma } from "../database/client.js";

const where = (start?: Date, end?: Date, salesChannels?: string[]) => ({
  deletedAt: null,
  occurredAt: { gte: start, lte: end },
  salesChannel: salesChannels?.length ? { in: salesChannels } : undefined,
});

export class DashboardRepository {
  transactions(start?: Date, end?: Date, salesChannels?: string[]) {
    return prisma.transaction.findMany({ where: where(start, end, salesChannels), select: { occurredAt: true, netSales: true, salesChannel: true, orderType: true } });
  }
  productMetrics(start?: Date, end?: Date, salesChannels?: string[]) {
    return prisma.transactionItem.groupBy({ by: ["productId"], where: { transaction: { is: where(start, end, salesChannels) } }, _sum: { quantity: true, salesAmount: true } });
  }
  productDetails(ids: string[]) {
    return prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, category: { select: { name: true } } } });
  }
  summary(start?: Date, end?: Date, salesChannels?: string[]) {
    return prisma.transaction.aggregate({ where: where(start, end, salesChannels), _sum: { netSales: true }, _avg: { netSales: true, guestCount: true }, _count: { id: true } });
  }
  customers(start?: Date, end?: Date, salesChannels?: string[]) {
    return prisma.transaction.findMany({ where: { ...where(start, end, salesChannels), customerId: { not: null } }, select: { customerId: true }, distinct: ["customerId"] });
  }
  products() { return prisma.product.count({ where: { deletedAt: null } }); }
  imports() { return prisma.importBatch.findMany({ take: 5, orderBy: { startedAt: "desc" }, include: { createdBy: { select: { firstName: true, lastName: true, email: true } } } }); }
}
