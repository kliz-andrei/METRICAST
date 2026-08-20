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
    // ProductSales and Payments exports have no date column. Reporting the
    // Transactions date range for them would falsely imply verified coverage.
    const unavailableDateRange = { start: null, end: null };
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
          dateRange: unavailableDateRange,
          latestImport: latest,
        },
        {
          key: "payments",
          name: "Payments",
          recordCount: payments,
          dateRange: unavailableDateRange,
          latestImport: latest,
        },
      ],
    };
  }

  async deletionImpact(id: string) {
    const batch = await prisma.importBatch.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        transactionFile: true,
        productSalesFile: true,
        paymentsFile: true,
        startedAt: true,
        completedAt: true,
      },
    });
    if (!batch) return null;

    const [
      transactions,
      items,
      payments,
      errors,
      unsafeItems,
      unsafePayments,
      forecasts,
    ] = await prisma.$transaction([
      prisma.transaction.count({ where: { importBatchId: id } }),
      prisma.transactionItem.count({ where: { importBatchId: id } }),
      prisma.payment.count({ where: { importBatchId: id } }),
      prisma.importError.count({ where: { importBatchId: id } }),
      prisma.transactionItem.count({
        where: {
          transaction: { importBatchId: id },
          OR: [{ importBatchId: { not: id } }, { importBatchId: null }],
        },
      }),
      prisma.payment.count({
        where: {
          transaction: { importBatchId: id },
          OR: [{ importBatchId: { not: id } }, { importBatchId: null }],
        },
      }),
      prisma.forecast.count(),
    ]);

    return {
      batch,
      affected: {
        transactions,
        transactionItems: items,
        payments,
        importErrors: errors,
        importBatch: 1,
      },
      safety: {
        canDelete:
          batch.status === "COMPLETED" &&
          unsafeItems === 0 &&
          unsafePayments === 0,
        unsafeTransactionItems: unsafeItems,
        unsafePayments,
        reason:
          batch.status !== "COMPLETED"
            ? "Only completed imports can be removed because they own imported POS data."
            : unsafeItems || unsafePayments
              ? "This legacy batch has related rows without sufficient batch provenance and cannot be safely removed."
              : null,
      },
      forecastWarning: forecasts > 0,
    };
  }

  async deleteCompletedBatch(
    id: string,
    actorId: string,
    confirmation: string,
  ) {
    const impact = await this.deletionImpact(id);
    if (!impact) throw new Error("IMPORT_NOT_FOUND");
    if (confirmation !== id) throw new Error("INVALID_CONFIRMATION");
    if (!impact.safety.canDelete) throw new Error("UNSAFE_IMPORT_DELETION");

    return prisma.$transaction(async (tx) => {
      const current = await tx.importBatch.findUnique({
        where: { id },
        select: { id: true, status: true, transactionFile: true },
      });
      if (!current) throw new Error("IMPORT_NOT_FOUND");
      if (current.status !== "COMPLETED")
        throw new Error("UNSAFE_IMPORT_DELETION");

      const [unsafeItems, unsafePayments] = await Promise.all([
        tx.transactionItem.count({
          where: {
            transaction: { importBatchId: id },
            OR: [{ importBatchId: { not: id } }, { importBatchId: null }],
          },
        }),
        tx.payment.count({
          where: {
            transaction: { importBatchId: id },
            OR: [{ importBatchId: { not: id } }, { importBatchId: null }],
          },
        }),
      ]);
      if (unsafeItems || unsafePayments)
        throw new Error("UNSAFE_IMPORT_DELETION");

      const [items, payments] = await Promise.all([
        tx.transactionItem.deleteMany({ where: { importBatchId: id } }),
        tx.payment.deleteMany({ where: { importBatchId: id } }),
      ]);
      const transactions = await tx.transaction.deleteMany({
        where: { importBatchId: id },
      });
      const errors = await tx.importError.deleteMany({
        where: { importBatchId: id },
      });
      await tx.importBatch.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "DELETE_IMPORT_BATCH",
          entityType: "ImportBatch",
          entityId: id,
          metadata: {
            result: "SUCCESS",
            transactionFile: current.transactionFile,
            removed: {
              transactions: transactions.count,
              transactionItems: items.count,
              payments: payments.count,
              importErrors: errors.count,
              importBatch: 1,
            },
          },
        },
      });

      return {
        removed: {
          transactions: transactions.count,
          transactionItems: items.count,
          payments: payments.count,
          importErrors: errors.count,
          importBatch: 1,
        },
        forecastWarning: impact.forecastWarning,
      };
    });
  }

  async recordFailedDeletion(actorId: string, id: string, reason: string) {
    await prisma.auditLog.create({
      data: {
        actorId,
        action: "DELETE_IMPORT_BATCH_FAILED",
        entityType: "ImportBatch",
        entityId: id,
        metadata: { result: "FAILED", reason },
      },
    });
  }
}
