import { describe, expect, it, vi } from 'vitest';
import { deletionConfirmation, PosDataDeletionService } from './pos-data-deletion.service.js';

const range = { startDate: '2026-08-01', endDate: '2026-08-31' };
const scope = {
  transactionIds: ['transaction-1', 'transaction-2'],
  transactionCount: 2,
  transactionItemCount: 4,
  paymentCount: 2,
  importBatchCount: 1,
  earliestTransactionDate: new Date('2026-08-01T10:00:00+08:00'),
  latestTransactionDate: new Date('2026-08-31T22:00:00+08:00'),
  remainingTransactions: 12,
  remainingTransactionItems: 24,
  remainingPayments: 12,
  forecastWarning: true,
  version: 'a'.repeat(64),
};

describe('PosDataDeletionService', () => {
  it('returns database-backed impact and preserves the forecast warning', async () => {
    const repository = { preview: vi.fn(async () => scope) };
    const result = await new PosDataDeletionService(repository as never).preview(range);
    expect(result.affected).toMatchObject({ transactions: 2, transactionItems: 4, payments: 2, importBatches: 1 });
    expect(result.remaining).toEqual({ transactions: 12, transactionItems: 24, payments: 12 });
    expect(result.forecastWarning).toBe(true);
    expect(result.confirmationPhrase).toBe(deletionConfirmation(range));
  });

  it('requires the exact range confirmation before invoking the repository', async () => {
    const repository = { execute: vi.fn() };
    const service = new PosDataDeletionService(repository as never);
    await expect(service.execute(range, scope.version, 'DELETE POS DATA', 'administrator-id')).rejects.toMatchObject({ statusCode: 422, code: 'INVALID_CONFIRMATION' });
    expect(repository.execute).not.toHaveBeenCalled();
  });

  it('reports stale previews and empty ranges without deleting records', async () => {
    const stale = { execute: vi.fn(async () => { throw new Error('STALE_PREVIEW'); }) };
    const empty = { execute: vi.fn(async () => { throw new Error('NO_RECORDS_FOUND'); }) };
    const confirmation = deletionConfirmation(range);
    await expect(new PosDataDeletionService(stale as never).execute(range, scope.version, confirmation, 'administrator-id')).rejects.toMatchObject({ statusCode: 409, code: 'STALE_PREVIEW' });
    await expect(new PosDataDeletionService(empty as never).execute(range, scope.version, confirmation, 'administrator-id')).rejects.toMatchObject({ statusCode: 404, code: 'NO_RECORDS_FOUND' });
  });

  it('returns only deletion counts supplied by the transaction-safe repository', async () => {
    const repository = { execute: vi.fn(async () => ({ removed: { transactions: 2, transactionItems: 4, payments: 2, importBatches: 0 }, affectedImportBatches: 1, forecastWarning: true })) };
    const result = await new PosDataDeletionService(repository as never).execute(range, scope.version, deletionConfirmation(range), 'administrator-id');
    expect(result).toEqual({ removed: { transactions: 2, transactionItems: 4, payments: 2, importBatches: 0 }, affectedImportBatches: 1, forecastWarning: true });
  });
});
