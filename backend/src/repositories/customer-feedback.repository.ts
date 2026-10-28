import { prisma } from '../database/client.js';

export type FeedbackTrendGranularity = 'daily' | 'weekly' | 'monthly';
type FeedbackTrend = { date: string; overall: number; food: number; service: number; responses: bigint };
export type FeedbackDimension = 'overall' | 'food' | 'service';

export class CustomerFeedbackRepository {
  findImportByChecksum(sourceChecksum: string) { return prisma.customerFeedbackImport.findUnique({ where: { sourceChecksum } }); }
  createImport(data: { sourceChecksum: string; filename: string; totalRows: number; createdById: string; ratings: Array<{ feedbackDate: Date; overallSatisfaction: number; foodSatisfaction: number; serviceSatisfaction: number }> }) {
    return prisma.customerFeedbackImport.create({ data: { sourceChecksum: data.sourceChecksum, filename: data.filename, totalRows: data.totalRows, createdById: data.createdById, status: 'COMPLETED', importedRows: data.ratings.length, completedAt: new Date(), ratings: { createMany: { data: data.ratings } } } });
  }
  recordImportAudit(actorId: string, id: string, filename: string, importedRows: number) { return prisma.auditLog.create({ data: { actorId, action: 'CUSTOMER_FEEDBACK_IMPORTED', entityType: 'CustomerFeedbackImport', entityId: id, metadata: { filename, importedRows, description: 'Customer feedback dataset imported' } } }); }
  async overview() {
    const [entry, records] = await Promise.all([
      prisma.customerFeedbackImport.findFirst({ where: { status: 'COMPLETED' }, orderBy: { completedAt: 'desc' } }),
      prisma.customerFeedbackRating.count(),
    ]);
    return entry ? { ...entry, records } : null;
  }
  imports() { return prisma.customerFeedbackImport.findMany({ orderBy: { startedAt: 'desc' }, include: { _count: { select: { ratings: true } }, createdBy: { select: { firstName: true, lastName: true } } } }); }
  async summary(startDate?: Date, endDate?: Date) {
    const where = { feedbackDate: { gte: startDate, lte: endDate } };
    const [aggregate, overall, food, service] = await Promise.all([
      prisma.customerFeedbackRating.aggregate({ where, _avg: { overallSatisfaction: true, foodSatisfaction: true, serviceSatisfaction: true }, _count: { id: true }, _min: { feedbackDate: true }, _max: { feedbackDate: true } }),
      prisma.customerFeedbackRating.groupBy({ by: ['overallSatisfaction'], where, _count: { id: true }, orderBy: { overallSatisfaction: 'asc' } }),
      prisma.customerFeedbackRating.groupBy({ by: ['foodSatisfaction'], where, _count: { id: true }, orderBy: { foodSatisfaction: 'asc' } }),
      prisma.customerFeedbackRating.groupBy({ by: ['serviceSatisfaction'], where, _count: { id: true }, orderBy: { serviceSatisfaction: 'asc' } }),
    ]);
    return {
      aggregate,
      distributions: {
        overall: overall.map((row) => ({ rating: row.overallSatisfaction, responses: row._count.id })),
        food: food.map((row) => ({ rating: row.foodSatisfaction, responses: row._count.id })),
        service: service.map((row) => ({ rating: row.serviceSatisfaction, responses: row._count.id })),
      },
    };
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
