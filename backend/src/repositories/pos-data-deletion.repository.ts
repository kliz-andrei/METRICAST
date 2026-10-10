import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../database/client.js';

export interface PosDeletionRange {
  startDate: string;
  endDate: string;
}

export interface PosDeletionScope {
  transactionIds: string[];
  transactionCount: number;
  transactionItemCount: number;
  paymentCount: number;
  importBatchCount: number;
  earliestTransactionDate: Date | null;
  latestTransactionDate: Date | null;
  remainingTransactions: number;
  remainingTransactionItems: number;
  remainingPayments: number;
  forecastWarning: boolean;
  version: string;
}

type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

const boundaries = (range: PosDeletionRange) => ({
  gte: new Date(`${range.startDate}T00:00:00+08:00`),
  lte: new Date(`${range.endDate}T23:59:59.999+08:00`),
});

const scopeVersion = (transactions: Array<{ id: string; updatedAt: Date }>, transactionItemCount: number, paymentCount: number) =>
  createHash('sha256')
    .update(JSON.stringify({
      transactions: transactions.map((transaction) => [transaction.id, transaction.updatedAt.toISOString()]),
      transactionItemCount,
      paymentCount,
    }))
    .digest('hex');

export class PosDataDeletionRepository {
  private async scope(client: PrismaClientLike, range: PosDeletionRange): Promise<PosDeletionScope> {
    const transactionWhere = { deletedAt: null, occurredAt: boundaries(range) };
    const transactions = await client.transaction.findMany({
      where: transactionWhere,
      orderBy: { occurredAt: 'asc' },
      select: { id: true, importBatchId: true, occurredAt: true, updatedAt: true },
    });
    const transactionIds = transactions.map((transaction) => transaction.id);
    const ids = { in: transactionIds };
    const [transactionItemCount, paymentCount, totalTransactions, totalTransactionItems, totalPayments, forecastCount] = await Promise.all([
      transactionIds.length ? client.transactionItem.count({ where: { transactionId: ids } }) : 0,
      transactionIds.length ? client.payment.count({ where: { transactionId: ids } }) : 0,
      client.transaction.count({ where: { deletedAt: null } }),
      client.transactionItem.count(),
      client.payment.count(),
      client.forecast.count(),
    ]);

    return {
      transactionIds,
      transactionCount: transactionIds.length,
      transactionItemCount,
      paymentCount,
      importBatchCount: new Set(transactions.map((transaction) => transaction.importBatchId).filter(Boolean)).size,
      earliestTransactionDate: transactions[0]?.occurredAt ?? null,
      latestTransactionDate: transactions.at(-1)?.occurredAt ?? null,
      remainingTransactions: totalTransactions - transactionIds.length,
      remainingTransactionItems: totalTransactionItems - transactionItemCount,
      remainingPayments: totalPayments - paymentCount,
      forecastWarning: forecastCount > 0,
      version: scopeVersion(transactions, transactionItemCount, paymentCount),
    };
  }

  preview(range: PosDeletionRange) {
    return this.scope(prisma, range);
  }

  async execute(range: PosDeletionRange, expectedVersion: string, actorId: string) {
    try {
      return await prisma.$transaction(async (tx) => {
      const current = await this.scope(tx, range);
      if (current.transactionCount === 0) throw new Error('NO_RECORDS_FOUND');
      if (current.version !== expectedVersion) throw new Error('STALE_PREVIEW');

      const ids = { in: current.transactionIds };
      const [items, payments] = await Promise.all([
        tx.transactionItem.deleteMany({ where: { transactionId: ids } }),
        tx.payment.deleteMany({ where: { transactionId: ids } }),
      ]);
      const transactions = await tx.transaction.deleteMany({
        where: { id: ids, deletedAt: null },
      });
      if (transactions.count !== current.transactionCount) throw new Error('STALE_PREVIEW');

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'DELETE_POS_DATA_BY_DATE',
          entityType: 'Transaction',
          metadata: {
            dateRange: { startDate: range.startDate, endDate: range.endDate },
            removed: {
              transactions: transactions.count,
              transactionItems: items.count,
              payments: payments.count,
              importBatches: 0,
            },
            affectedImportBatches: current.importBatchCount,
            forecastWarning: current.forecastWarning,
          },
        },
      });

        return {
        removed: {
          transactions: transactions.count,
          transactionItems: items.count,
          payments: payments.count,
          importBatches: 0,
        },
        affectedImportBatches: current.importBatchCount,
        forecastWarning: current.forecastWarning,
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new Error('CONCURRENT_DELETION');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new Error('DELETE_CONSTRAINT_FAILED');
      }
      throw error;
    }
  }
}
