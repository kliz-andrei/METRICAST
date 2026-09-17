import { prisma } from '../database/client.js';

export type FeedbackTrendGranularity = 'daily' | 'weekly' | 'monthly';
type FeedbackTrend = { date: string; overall: number; food: number; service: number; responses: bigint };

export class CustomerFeedbackRepository {
  findImportByChecksum(sourceChecksum: string) { return prisma.customerFeedbackImport.findUnique({ where: { sourceChecksum } }); }
  createImport(data: { sourceChecksum: string; filename: string; totalRows: number; createdById: string; ratings: Array<{ feedbackDate: Date; overallSatisfaction: number; foodSatisfaction: number; serviceSatisfaction: number }> }) {
    return prisma.customerFeedbackImport.create({ data: { sourceChecksum: data.sourceChecksum, filename: data.filename, totalRows: data.totalRows, createdById: data.createdById, status: 'COMPLETED', importedRows: data.ratings.length, completedAt: new Date(), ratings: { createMany: { data: data.ratings } } } });
  }
  recordImportAudit(actorId: string, id: string, filename: string, importedRows: number) { return prisma.auditLog.create({ data: { actorId, action: 'CUSTOMER_FEEDBACK_IMPORTED', entityType: 'CustomerFeedbackImport', entityId: id, metadata: { filename, importedRows, description: 'Customer feedback dataset imported' } } }); }
  overview() { return prisma.customerFeedbackImport.findFirst({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' }, include: { _count: { select: { ratings: true } } } }); }
  imports() { return prisma.customerFeedbackImport.findMany({ orderBy: { startedAt: 'desc' }, include: { _count: { select: { ratings: true } }, createdBy: { select: { firstName: true, lastName: true } } } }); }
  async deleteImport(id: string, actorId: string) { return prisma.$transaction(async (tx) => { const entry = await tx.customerFeedbackImport.findUnique({ where: { id }, include: { _count: { select: { ratings: true } } } }); if (!entry) return null; await tx.customerFeedbackImport.delete({ where: { id } }); await tx.auditLog.create({ data: { actorId, action: 'CUSTOMER_FEEDBACK_DELETED', entityType: 'CustomerFeedbackImport', entityId: id, metadata: { filename: entry.filename, removedRatings: entry._count.ratings } } }); return { id, removedRatings: entry._count.ratings }; }); }
  async summary(startDate?: Date, endDate?: Date) {
    const where = { feedbackDate: { gte: startDate, lte: endDate } };
    const [aggregate, distribution] = await Promise.all([
      prisma.customerFeedbackRating.aggregate({ where, _avg: { overallSatisfaction: true, foodSatisfaction: true, serviceSatisfaction: true }, _count: { id: true }, _min: { feedbackDate: true }, _max: { feedbackDate: true } }),
      prisma.customerFeedbackRating.groupBy({ by: ['overallSatisfaction'], where, _count: { id: true }, orderBy: { overallSatisfaction: 'asc' } }),
    ]);
    return { aggregate, distribution };
  }

  trend(startDate: Date | undefined, endDate: Date | undefined, granularity: FeedbackTrendGranularity) {
    if (granularity === 'weekly') {
      return prisma.$queryRaw<Array<FeedbackTrend>>`SELECT TO_CHAR(DATE_TRUNC('week', "feedbackDate"), 'YYYY-MM-DD') AS date, AVG("overallSatisfaction")::float AS overall, AVG("foodSatisfaction")::float AS food, AVG("serviceSatisfaction")::float AS service, COUNT(*) AS responses FROM customer_feedback_ratings WHERE "feedbackDate" >= COALESCE(${startDate}, '-infinity'::date) AND "feedbackDate" <= COALESCE(${endDate}, 'infinity'::date) GROUP BY DATE_TRUNC('week', "feedbackDate") ORDER BY DATE_TRUNC('week', "feedbackDate") ASC`;
    }
    if (granularity === 'monthly') {
      return prisma.$queryRaw<Array<FeedbackTrend>>`SELECT TO_CHAR("feedbackDate", 'YYYY-MM') AS date, AVG("overallSatisfaction")::float AS overall, AVG("foodSatisfaction")::float AS food, AVG("serviceSatisfaction")::float AS service, COUNT(*) AS responses FROM customer_feedback_ratings WHERE "feedbackDate" >= COALESCE(${startDate}, '-infinity'::date) AND "feedbackDate" <= COALESCE(${endDate}, 'infinity'::date) GROUP BY TO_CHAR("feedbackDate", 'YYYY-MM') ORDER BY date ASC`;
    }
    return prisma.$queryRaw<Array<FeedbackTrend>>`SELECT TO_CHAR("feedbackDate", 'YYYY-MM-DD') AS date, AVG("overallSatisfaction")::float AS overall, AVG("foodSatisfaction")::float AS food, AVG("serviceSatisfaction")::float AS service, COUNT(*) AS responses FROM customer_feedback_ratings WHERE "feedbackDate" >= COALESCE(${startDate}, '-infinity'::date) AND "feedbackDate" <= COALESCE(${endDate}, 'infinity'::date) GROUP BY "feedbackDate" ORDER BY "feedbackDate" ASC`;
  }
}
