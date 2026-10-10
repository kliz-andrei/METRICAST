import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { paymentRowSchema, productSalesRowSchema, transactionRowSchema } from './pos-validation.js';
import { PosImportService, validateCrossDataset, validateRows } from './pos-import.service.js';

const transaction = {
  TransactionID: 'TX-001', InvoiceNo: 'INV-001', Date: '01/06/2026', Time: '10:00:00',
  GuestCount: '2', OrderType: 'Dine-in', SalesChannel: 'POS', GrossSales: '100',
  ServiceCharge: '0', DiscountType: '', DiscountAmount: '0', AmountDue: '100', NetSales: '100',
};
const item = { TransactionID: 'TX-001', ProductName: 'Sample Item', Category: 'Meals', Qty: '1', UnitPrice: '100', SalesAmount: '100' };
const payment = { TransactionID: 'TX-001', PaymentMethod: 'Cash', PaymentProvider: '', Amount: '100' };

const validate = (
  transactions: Record<string, string>[],
  items: Record<string, string>[],
  payments: Record<string, string>[],
) => validateCrossDataset(
  validateRows(transactions, transactionRowSchema, 'Transactions.csv'),
  validateRows(items, productSalesRowSchema, 'ProductSales.csv'),
  validateRows(payments, paymentRowSchema, 'Payments.csv'),
  false,
);

describe('POS import cross-dataset validation', () => {
  it('accepts complete related rows without blocking the batch', () => {
    const result = validate([transaction], [item], [payment]);
    expect(result).toMatchObject({ ready: true, status: 'READY_TO_IMPORT' });
    expect(result.errors).toHaveLength(0);
  });

  it('blocks duplicate transaction IDs before persistence', () => {
    const result = validate([transaction, { ...transaction, InvoiceNo: 'INV-002' }], [item], [payment]);
    expect(result.ready).toBe(false);
    expect(result.status).toBe('IMPORT_BLOCKED');
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceFile: 'Transactions.csv', field: 'TransactionID', message: 'Duplicate TransactionID TX-001.' }),
    ]));
  });

  it('blocks orphan Product Sales and Payment records before persistence', () => {
    const orphanItem = { ...item, TransactionID: 'MISSING-ITEM' };
    const orphanPayment = { ...payment, TransactionID: 'MISSING-PAYMENT' };
    const result = validate([transaction], [orphanItem], [orphanPayment]);
    expect(result.ready).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceFile: 'ProductSales.csv', field: 'TransactionID', message: 'No transaction row exists for MISSING-ITEM.' }),
      expect.objectContaining({ sourceFile: 'Payments.csv', field: 'TransactionID', message: 'No transaction row exists for MISSING-PAYMENT.' }),
    ]));
  });

  it('keeps incomplete relationships as visible non-blocking warnings', () => {
    const result = validate([transaction], [], []);
    expect(result).toMatchObject({ ready: true, status: 'READY_WITH_WARNINGS' });
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'MISSING_PRODUCT_SALES',
      'MISSING_PAYMENTS',
    ]);
  });

  it('does not begin transaction persistence when validation blocks an import', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'metricast-pos-validation-'));
    const files = {
      transactions: join(directory, 'Transactions.csv'),
      productSales: join(directory, 'ProductSales.csv'),
      payments: join(directory, 'Payments.csv'),
    };
    await Promise.all([
      writeFile(files.transactions, 'TransactionID,InvoiceNo,Date,Time,GuestCount,OrderType,SalesChannel,GrossSales,ServiceCharge,DiscountType,DiscountAmount,AmountDue,NetSales\nTX-001,INV-001,01/06/2026,10:00:00,2,Dine-in,POS,100,0,,0,100,100\nTX-001,INV-002,01/06/2026,10:00:00,2,Dine-in,POS,100,0,,0,100,100\n'),
      writeFile(files.productSales, 'TransactionID,ProductName,Category,Qty,UnitPrice,SalesAmount\nTX-001,Sample Item,Meals,1,100,100\n'),
      writeFile(files.payments, 'TransactionID,PaymentMethod,PaymentProvider,Amount\nTX-001,Cash,,100\n'),
    ]);
    const db = {
      importBatch: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'batch-1' }),
        update: vi.fn().mockResolvedValue({}),
      },
      importError: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
      $transaction: vi.fn().mockImplementation(async (operations: Promise<unknown>[]) => Promise.all(operations)),
      transaction: { createMany: vi.fn() },
    };
    try {
      await expect(new PosImportService(db as never).import(files)).rejects.toThrow('POS import rejected');
      expect(db.importError.createMany).toHaveBeenCalledOnce();
      expect(db.transaction.createMany).not.toHaveBeenCalled();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
