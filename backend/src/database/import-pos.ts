import 'dotenv/config';
import { resolve } from 'node:path';
import { prisma } from './client.js';
import { PosImportService } from './pos-import.service.js';

const [transactions, productSales, payments] = process.argv.slice(2);
if (!transactions || !productSales || !payments) {
  throw new Error('Usage: npm run import:csv -- <Transactions.csv> <ProductSales.csv> <Payments.csv>');
}

try {
  const result = await new PosImportService(prisma).import(
    { transactions: resolve(transactions), productSales: resolve(productSales), payments: resolve(payments) },
    ({ status, processedRows, totalRows, message }) => console.info(`[${status}] ${processedRows}/${totalRows}: ${message}`)
  );
  console.info(`Imported ${result.importedTransactions} transactions, ${result.importedItems} items, and ${result.importedPayments} payments. Skipped ${result.skippedTransactions} existing transactions.`);
} finally {
  await prisma.$disconnect();
}
