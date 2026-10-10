import { AppError } from '../lib/errors.js';
import { PosDataDeletionRepository, type PosDeletionRange, type PosDeletionScope } from '../repositories/pos-data-deletion.repository.js';

export const deletionConfirmation = (range: PosDeletionRange) =>
  `DELETE POS DATA ${range.startDate} TO ${range.endDate}`;

const serializeImpact = (range: PosDeletionRange, scope: PosDeletionScope) => ({
  range,
  affected: {
    transactions: scope.transactionCount,
    transactionItems: scope.transactionItemCount,
    payments: scope.paymentCount,
    importBatches: scope.importBatchCount,
    earliestTransactionDate: scope.earliestTransactionDate?.toISOString() ?? null,
    latestTransactionDate: scope.latestTransactionDate?.toISOString() ?? null,
  },
  remaining: {
    transactions: scope.remainingTransactions,
    transactionItems: scope.remainingTransactionItems,
    payments: scope.remainingPayments,
  },
  forecastWarning: scope.forecastWarning,
  previewToken: scope.version,
  confirmationPhrase: deletionConfirmation(range),
});

export class PosDataDeletionService {
  constructor(private readonly repository = new PosDataDeletionRepository()) {}

  async preview(range: PosDeletionRange) {
    return serializeImpact(range, await this.repository.preview(range));
  }

  async execute(range: PosDeletionRange, previewToken: string, confirmation: string, actorId: string) {
    if (confirmation !== deletionConfirmation(range)) {
      throw new AppError(422, 'Confirmation phrase does not match the selected date range.', 'INVALID_CONFIRMATION');
    }

    try {
      return await this.repository.execute(range, previewToken, actorId);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'DELETE_FAILED';
      if (code === 'NO_RECORDS_FOUND') {
        throw new AppError(404, 'No POS records were found for the selected date range. No data was changed.', 'NO_RECORDS_FOUND');
      }
      if (code === 'STALE_PREVIEW') {
        throw new AppError(409, 'The data changed after preview. Review the current impact before deleting.', 'STALE_PREVIEW');
      }
      if (code === 'CONCURRENT_DELETION') {
        throw new AppError(409, 'Another deletion changed this data. Review a new preview before trying again.', 'CONCURRENT_DELETION');
      }
      if (code === 'DELETE_CONSTRAINT_FAILED') {
        throw new AppError(409, 'The selected POS records could not be deleted safely because related records changed. No data was removed.', 'DELETE_CONSTRAINT_FAILED');
      }
      throw error;
    }
  }
}
