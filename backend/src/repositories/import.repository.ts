import { prisma } from "../database/client.js";

export class ImportRepository {
  list() {
    return prisma.importBatch.findMany({
      orderBy: {
        startedAt: "desc",
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        errors: {
          take: 20,
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            sourceFile: true,
            rowNumber: true,
            field: true,
            message: true,
            rawData: true,
            createdAt: true,
          },
        },
      },
    });
  }

  find(id: string) {
    return prisma.importBatch.findUnique({
      where: {
        id,
      },
      include: {
        errors: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            sourceFile: true,
            rowNumber: true,
            field: true,
            message: true,
            rawData: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async overview() {
    const [
      transactions,
      transactionItems,
      payments,
      latestImport,
      latestCompletedImport,
    ] = await prisma.$transaction([
      prisma.transaction.aggregate({
        where: { deletedAt: null },
        _count: { id: true },
        _min: { occurredAt: true },
        _max: { occurredAt: true },
      }),
      prisma.transactionItem.count(),
      prisma.payment.count(),
      prisma.importBatch.findFirst({
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
          errorCount: true,
        },
      }),
      prisma.importBatch.findFirst({
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
          errorCount: true,
        },
      }),
    ]);

    const dateRange = {
      start: transactions._min.occurredAt,
      end: transactions._max.occurredAt,
    };
    const latest = latestImport ?? latestCompletedImport;

    return {
      datasets: [
        {
          key: "transactions",
          name: "Transactions",
          recordCount: transactions._count.id,
          dateRange,
          latestImport: latest,
        },
        {
          key: "productSales",
          name: "Product Sales",
          recordCount: transactionItems,
          dateRange,
          latestImport: latest,
        },
        {
          key: "payments",
          name: "Payments",
          recordCount: payments,
          dateRange,
          latestImport: latest,
        },
      ],
    };
  }
}
