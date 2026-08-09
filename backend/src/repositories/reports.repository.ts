import { prisma } from '../database/client.js';

export class ReportsRepository {
  async metadata() {
    const [range, channels, orderTypes, categories] = await Promise.all([
      prisma.transaction.aggregate({ where: { deletedAt: null }, _min: { occurredAt: true }, _max: { occurredAt: true } }),
      prisma.transaction.groupBy({ by: ['salesChannel'], where: { deletedAt: null }, orderBy: { salesChannel: 'asc' } }),
      prisma.transaction.groupBy({ by: ['orderType'], where: { deletedAt: null }, orderBy: { orderType: 'asc' } }),
      prisma.category.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
    ]);
    return { range, channels, orderTypes, categories };
  }
}
