import { beforeEach, describe, expect, it, vi } from 'vitest';

const transactions = [
  { id: 'transaction-a', importBatchId: 'batch-a', occurredAt: new Date('2026-08-01T10:00:00+08:00'), updatedAt: new Date('2026-08-01T10:00:00+08:00') },
  { id: 'transaction-b', importBatchId: 'batch-a', occurredAt: new Date('2026-08-31T22:00:00+08:00'), updatedAt: new Date('2026-08-31T22:00:00+08:00') },
];

const transactionFindMany = vi.fn();
const transactionCount = vi.fn();
const transactionDeleteMany = vi.fn();
const transactionItemCount = vi.fn();
const transactionItemDeleteMany = vi.fn();
const paymentCount = vi.fn();
const paymentDeleteMany = vi.fn();
const forecastCount = vi.fn();
const auditCreate = vi.fn();
const importBatchDelete = vi.fn();
const tx = {
  transaction: { findMany: transactionFindMany, count: transactionCount, deleteMany: transactionDeleteMany },
  transactionItem: { count: transactionItemCount, deleteMany: transactionItemDeleteMany },
  payment: { count: paymentCount, deleteMany: paymentDeleteMany },
  forecast: { count: forecastCount },
  auditLog: { create: auditCreate },
  importBatch: { delete: importBatchDelete },
};
const prisma = { ...tx, $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };

vi.mock('../database/client.js', () => ({ prisma }));

const { PosDataDeletionRepository } = await import('./pos-data-deletion.repository.js');
const range = { startDate: '2026-08-01', endDate: '2026-08-31' };

const configureScope = (rows = transactions) => {
  transactionFindMany.mockResolvedValue(rows);
  transactionCount.mockImplementation(({ where }: { where?: { occurredAt?: unknown } } = {}) => Promise.resolve(where?.occurredAt ? rows.length : 12));
  transactionItemCount.mockImplementation(({ where }: { where?: { transactionId?: unknown } } = {}) => Promise.resolve(where?.transactionId ? 4 : 24));
  paymentCount.mockImplementation(({ where }: { where?: { transactionId?: unknown } } = {}) => Promise.resolve(where?.transactionId ? 2 : 12));
  forecastCount.mockResolvedValue(3);
  transactionItemDeleteMany.mockResolvedValue({ count: 4 });
  paymentDeleteMany.mockResolvedValue({ count: 2 });
  transactionDeleteMany.mockResolvedValue({ count: rows.length });
  auditCreate.mockResolvedValue({ id: 'audit-id' });
};

beforeEach(() => {
  vi.clearAllMocks();
  configureScope();
});

describe('PosDataDeletionRepository', () => {
  it('previews only the selected dates and reports remaining records without deleting a batch', async () => {
    const preview = await new PosDataDeletionRepository().preview(range);
    expect(preview).toMatchObject({ transactionCount: 2, transactionItemCount: 4, paymentCount: 2, importBatchCount: 1, remainingTransactions: 10, remainingTransactionItems: 20, remainingPayments: 10, forecastWarning: true });
    expect(transactionFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }));
    expect(importBatchDelete).not.toHaveBeenCalled();
  });

  it('deletes only selected transactions and related records while retaining the import batch and forecasts', async () => {
    const repository = new PosDataDeletionRepository();
    const preview = await repository.preview(range);
    await expect(repository.execute(range, preview.version, 'administrator-id')).resolves.toMatchObject({ removed: { transactions: 2, transactionItems: 4, payments: 2, importBatches: 0 }, affectedImportBatches: 1, forecastWarning: true });
    expect(transactionItemDeleteMany).toHaveBeenCalledWith({ where: { transactionId: { in: ['transaction-a', 'transaction-b'] } } });
    expect(paymentDeleteMany).toHaveBeenCalledWith({ where: { transactionId: { in: ['transaction-a', 'transaction-b'] } } });
    expect(transactionDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ['transaction-a', 'transaction-b'] }, deletedAt: null } });
    expect(importBatchDelete).not.toHaveBeenCalled();
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'DELETE_POS_DATA_BY_DATE' }) }));
  });

  it('rejects stale previews before deleting any selected POS record', async () => {
    const repository = new PosDataDeletionRepository();
    const preview = await repository.preview(range);
    transactions[1] = { ...transactions[1], updatedAt: new Date('2026-09-01T10:00:00+08:00') };
    await expect(repository.execute(range, preview.version, 'administrator-id')).rejects.toThrow('STALE_PREVIEW');
    expect(transactionDeleteMany).not.toHaveBeenCalled();
    transactions[1] = { ...transactions[1], updatedAt: new Date('2026-08-31T22:00:00+08:00') };
  });

  it('does not start deletion when the selected range has no records', async () => {
    configureScope([]);
    await expect(new PosDataDeletionRepository().execute(range, 'a'.repeat(64), 'administrator-id')).rejects.toThrow('NO_RECORDS_FOUND');
    expect(transactionItemDeleteMany).not.toHaveBeenCalled();
    expect(paymentDeleteMany).not.toHaveBeenCalled();
    expect(transactionDeleteMany).not.toHaveBeenCalled();
  });

  it('propagates a child-record failure so the database transaction can roll back', async () => {
    const repository = new PosDataDeletionRepository();
    const preview = await repository.preview(range);
    transactionItemDeleteMany.mockRejectedValueOnce(new Error('child deletion failed'));
    await expect(repository.execute(range, preview.version, 'administrator-id')).rejects.toThrow('child deletion failed');
    expect(transactionDeleteMany).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });
});
