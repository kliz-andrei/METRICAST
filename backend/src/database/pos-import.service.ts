import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { parse } from "csv-parse/sync";
import type { z } from "zod";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  paymentRowSchema,
  productSalesRowSchema,
  sourceKey,
  transactionOccurredAt,
  transactionRowSchema,
  type PosPaymentRow,
  type PosProductSalesRow,
  type PosTransactionRow,
} from "./pos-validation.js";

type CsvRecord = Record<string, string>;
type RowError = {
  sourceFile: string;
  rowNumber: number;
  field?: string;
  message: string;
  rawData: CsvRecord;
};
type ValidatedRow<T> = { rowNumber: number; value: T };

export class PosCsvValidationError extends Error {}

export type PosImportFiles = {
  transactions: string;
  productSales: string;
  payments: string;
};
export type ImportProgress = {
  batchId: string;
  status: "validating" | "importing" | "completed" | "failed";
  processedRows: number;
  totalRows: number;
  message: string;
};
export type PosImportResult = {
  batchId: string;
  importedTransactions: number;
  importedItems: number;
  importedPayments: number;
  skippedTransactions: number;
};
export type PosValidationResult = {
  ready: boolean;
  status: "READY_TO_IMPORT" | "READY_WITH_WARNINGS" | "IMPORT_BLOCKED";
  summary: {
    transactions: { total: number; unique: number; duplicates: number };
    productSales: { total: number; orphans: number };
    payments: { total: number; orphans: number };
    relationships: {
      transactionsWithoutProductSales: number;
      transactionsWithoutPayments: number;
    };
    duplicateImport: boolean;
  };
  dateCoverage: {
    transactions: {
      start: string | null;
      end: string | null;
      status: "AVAILABLE" | "UNKNOWN";
    };
    productSales: { start: null; end: null; status: "UNKNOWN" };
    payments: { start: null; end: null; status: "UNKNOWN" };
    comparison: "UNKNOWN";
  };
  reconciliation: {
    productSales: "UNAVAILABLE";
    payments: "UNAVAILABLE";
  };
  errors: RowError[];
  warnings: Array<{ code: string; message: string; count: number }>;
};

const expectedHeaders = {
  transactions: [
    "TransactionID",
    "InvoiceNo",
    "Date",
    "Time",
    "GuestCount",
    "OrderType",
    "SalesChannel",
    "GrossSales",
    "ServiceCharge",
    "DiscountType",
    "DiscountAmount",
    "AmountDue",
    "NetSales",
  ],
  productSales: [
    "TransactionID",
    "ProductName",
    "Category",
    "Qty",
    "UnitPrice",
    "SalesAmount",
  ],
  payments: ["TransactionID", "PaymentMethod", "PaymentProvider", "Amount"],
} as const;

const parseCsv = async (
  filePath: string,
  expected: readonly string[],
): Promise<CsvRecord[]> => {
  let records: CsvRecord[];
  try {
    records = parse(await readFile(filePath, "utf8"), {
      columns: true,
      skip_empty_lines: true,
      bom: true,
    }) as CsvRecord[];
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown CSV error.";
    throw new PosCsvValidationError(
      `${basename(filePath)} could not be parsed: ${message}`,
    );
  }
  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  const missing = expected.filter((header) => !headers.includes(header));
  if (missing.length > 0)
    throw new PosCsvValidationError(
      `${basename(filePath)} is missing: ${missing.join(", ")}.`,
    );
  return records;
};

const validateRows = <T>(
  records: CsvRecord[],
  schema: z.ZodType<T, z.ZodTypeDef, CsvRecord>,
  sourceFile: string,
) => {
  const valid: ValidatedRow<T>[] = [];
  const errors: RowError[] = [];
  records.forEach((record, index) => {
    const result = schema.safeParse(record);
    if (result.success)
      valid.push({ rowNumber: index + 2, value: result.data });
    else
      result.error.issues.forEach((issue) =>
        errors.push({
          sourceFile,
          rowNumber: index + 2,
          field: issue.path[0]?.toString(),
          message: issue.message,
          rawData: record,
        }),
      );
  });
  return { valid, errors };
};

const checksum = (contents: string[]): string =>
  createHash("sha256").update(contents.join("\u0000")).digest("hex");
const chunk = <T>(values: T[], size = 2_000): T[][] =>
  Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );

const validateCrossDataset = (
  transactions: ReturnType<typeof validateRows<PosTransactionRow>>,
  items: ReturnType<typeof validateRows<PosProductSalesRow>>,
  payments: ReturnType<typeof validateRows<PosPaymentRow>>,
  duplicateImport: boolean,
): PosValidationResult => {
  const errors: RowError[] = [
    ...transactions.errors,
    ...items.errors,
    ...payments.errors,
  ];
  const occurrences = new Map<string, number>();
  for (const { value } of transactions.valid)
    occurrences.set(
      value.TransactionID,
      (occurrences.get(value.TransactionID) ?? 0) + 1,
    );
  const transactionIds = new Set(occurrences.keys());
  const duplicateIds = new Set(
    [...occurrences].filter(([, count]) => count > 1).map(([id]) => id),
  );
  for (const duplicateId of duplicateIds)
    for (const row of transactions.valid
      .filter(({ value }) => value.TransactionID === duplicateId)
      .slice(1))
      errors.push({
        sourceFile: "Transactions.csv",
        rowNumber: row.rowNumber,
        field: "TransactionID",
        message: `Duplicate TransactionID ${duplicateId}.`,
        rawData: { TransactionID: duplicateId },
      });
  const orphanItems = items.valid.filter(
    ({ value }) => !transactionIds.has(value.TransactionID),
  );
  const orphanPayments = payments.valid.filter(
    ({ value }) => !transactionIds.has(value.TransactionID),
  );
  for (const { rowNumber, value } of orphanItems)
    errors.push({
      sourceFile: "ProductSales.csv",
      rowNumber,
      field: "TransactionID",
      message: `No transaction row exists for ${value.TransactionID}.`,
      rawData: { TransactionID: value.TransactionID },
    });
  for (const { rowNumber, value } of orphanPayments)
    errors.push({
      sourceFile: "Payments.csv",
      rowNumber,
      field: "TransactionID",
      message: `No transaction row exists for ${value.TransactionID}.`,
      rawData: { TransactionID: value.TransactionID },
    });
  const withoutItems = [...transactionIds].filter(
    (id) => !items.valid.some(({ value }) => value.TransactionID === id),
  ).length;
  const withoutPayments = [...transactionIds].filter(
    (id) => !payments.valid.some(({ value }) => value.TransactionID === id),
  ).length;
  const warnings = [
    ...(duplicateImport
      ? [
          {
            code: "DUPLICATE_IMPORT",
            message: "This exact POS export has already been imported.",
            count: 1,
          },
        ]
      : []),
    ...(withoutItems
      ? [
          {
            code: "MISSING_PRODUCT_SALES",
            message: `${withoutItems} transaction(s) have no ProductSales row.`,
            count: withoutItems,
          },
        ]
      : []),
    ...(withoutPayments
      ? [
          {
            code: "MISSING_PAYMENTS",
            message: `${withoutPayments} transaction(s) have no Payment row.`,
            count: withoutPayments,
          },
        ]
      : []),
  ];
  const blocked = errors.length > 0 || duplicateImport;
  const transactionDates = transactions.valid
    .map(({ value }) => {
      const [day, month, year] = value.Date.split("/");
      return `${year}-${month}-${day}`;
    })
    .sort();
  return {
    ready: !blocked,
    status: blocked
      ? "IMPORT_BLOCKED"
      : warnings.length
        ? "READY_WITH_WARNINGS"
        : "READY_TO_IMPORT",
    summary: {
      transactions: {
        total:
          transactions.valid.length +
          new Set(transactions.errors.map((error) => error.rowNumber)).size,
        unique: transactionIds.size,
        duplicates: duplicateIds.size,
      },
      productSales: {
        total:
          items.valid.length +
          new Set(items.errors.map((error) => error.rowNumber)).size,
        orphans: orphanItems.length,
      },
      payments: {
        total:
          payments.valid.length +
          new Set(payments.errors.map((error) => error.rowNumber)).size,
        orphans: orphanPayments.length,
      },
      relationships: {
        transactionsWithoutProductSales: withoutItems,
        transactionsWithoutPayments: withoutPayments,
      },
      duplicateImport,
    },
    dateCoverage: {
      transactions: {
        start: transactionDates.at(0) ?? null,
        end: transactionDates.at(-1) ?? null,
        status: transactionDates.length ? "AVAILABLE" : "UNKNOWN",
      },
      productSales: { start: null, end: null, status: "UNKNOWN" },
      payments: { start: null, end: null, status: "UNKNOWN" },
      comparison: "UNKNOWN",
    },
    reconciliation: { productSales: "UNAVAILABLE", payments: "UNAVAILABLE" },
    errors,
    warnings,
  };
};

export class PosImportService {
  constructor(private readonly db: PrismaClient) {}

  async validate(files: PosImportFiles): Promise<PosValidationResult> {
    const [transactionsText, itemsText, paymentsText] = await Promise.all([
      readFile(files.transactions, "utf8"),
      readFile(files.productSales, "utf8"),
      readFile(files.payments, "utf8"),
    ]);
    const existing = await this.db.importBatch.findUnique({
      where: {
        sourceChecksum: checksum([transactionsText, itemsText, paymentsText]),
      },
      select: { status: true },
    });
    const [transactionRecords, itemRecords, paymentRecords] = await Promise.all(
      [
        parseCsv(files.transactions, expectedHeaders.transactions),
        parseCsv(files.productSales, expectedHeaders.productSales),
        parseCsv(files.payments, expectedHeaders.payments),
      ],
    );
    return validateCrossDataset(
      validateRows(
        transactionRecords,
        transactionRowSchema,
        basename(files.transactions),
      ),
      validateRows(
        itemRecords,
        productSalesRowSchema,
        basename(files.productSales),
      ),
      validateRows(paymentRecords, paymentRowSchema, basename(files.payments)),
      existing?.status === "COMPLETED",
    );
  }

  async import(
    files: PosImportFiles,
    onProgress?: (progress: ImportProgress) => void,
  ): Promise<PosImportResult> {
    const [transactionsText, itemsText, paymentsText] = await Promise.all([
      readFile(files.transactions, "utf8"),
      readFile(files.productSales, "utf8"),
      readFile(files.payments, "utf8"),
    ]);
    const sourceChecksum = checksum([
      transactionsText,
      itemsText,
      paymentsText,
    ]);
    const existingBatch = await this.db.importBatch.findUnique({
      where: { sourceChecksum },
    });
    if (existingBatch?.status === "COMPLETED")
      throw new Error(
        `This POS export was already imported as batch ${existingBatch.id}.`,
      );

    const [transactionRecords, itemRecords, paymentRecords] = await Promise.all(
      [
        parseCsv(files.transactions, expectedHeaders.transactions),
        parseCsv(files.productSales, expectedHeaders.productSales),
        parseCsv(files.payments, expectedHeaders.payments),
      ],
    );
    const totalRows =
      transactionRecords.length + itemRecords.length + paymentRecords.length;
    const batch =
      existingBatch ??
      (await this.db.importBatch.create({
        data: {
          sourceChecksum,
          transactionFile: basename(files.transactions),
          productSalesFile: basename(files.productSales),
          paymentsFile: basename(files.payments),
          totalRows,
        },
      }));
    onProgress?.({
      batchId: batch.id,
      status: "validating",
      processedRows: 0,
      totalRows,
      message: "Validating POS rows.",
    });

    const transactions = validateRows(
      transactionRecords,
      transactionRowSchema,
      basename(files.transactions),
    );
    const items = validateRows(
      itemRecords,
      productSalesRowSchema,
      basename(files.productSales),
    );
    const payments = validateRows(
      paymentRecords,
      paymentRowSchema,
      basename(files.payments),
    );
    const validation = validateCrossDataset(
      transactions,
      items,
      payments,
      false,
    );
    const errors = validation.errors;
    if (!validation.ready) {
      console.error("FIRST VALIDATION ERRORS");
      console.table(
        errors.slice(0, 30).map((error) => ({
          file: error.sourceFile,
          rowNumber: error.rowNumber,
          field: error.field,
          message: error.message,
          offendingValue: error.field
            ? error.rawData[error.field]
            : error.rawData,
        })),
      );
      await this.db.$transaction([
        this.db.importError.createMany({
          data: errors.map((error) => ({ importBatchId: batch.id, ...error })),
        }),
        this.db.importBatch.update({
          where: { id: batch.id },
          data: {
            status: "FAILED",
            errorCount: errors.length,
            completedAt: new Date(),
          },
        }),
      ]);
      onProgress?.({
        batchId: batch.id,
        status: "failed",
        processedRows: 0,
        totalRows,
        message: `${errors.length} validation error(s) logged.`,
      });
      throw new Error(
        `POS import rejected: ${errors.length} validation error(s). Inspect batch ${batch.id}.`,
      );
    }

    onProgress?.({
      batchId: batch.id,
      status: "importing",
      processedRows: 0,
      totalRows,
      message: "Persisting validated rows.",
    });
    try {
      const result = await this.db.$transaction(
        (tx) =>
          this.persist(
            tx,
            batch.id,
            transactions.valid,
            items.valid,
            payments.valid,
            totalRows,
          ),
        { timeout: 120_000 },
      );
      onProgress?.({
        batchId: batch.id,
        status: "completed",
        processedRows: totalRows,
        totalRows,
        message: "Import completed.",
      });
      return result;
    } catch (error) {
      await this.db.importBatch.update({
        where: { id: batch.id },
        data: { status: "FAILED", completedAt: new Date() },
      });
      onProgress?.({
        batchId: batch.id,
        status: "failed",
        processedRows: 0,
        totalRows,
        message: "Import rolled back; see application logs.",
      });
      throw error;
    }
  }

  private async persist(
    tx: Prisma.TransactionClient,
    batchId: string,
    transactions: ValidatedRow<PosTransactionRow>[],
    items: ValidatedRow<PosProductSalesRow>[],
    payments: ValidatedRow<PosPaymentRow>[],
    totalRows: number,
  ): Promise<PosImportResult> {
    const sourceIds = transactions.map(({ value }) => value.TransactionID);
    const existing = await tx.transaction.findMany({
      where: { sourceTransactionId: { in: sourceIds } },
      select: { sourceTransactionId: true },
    });
    const existingIds = new Set(existing.map((row) => row.sourceTransactionId));
    const newTransactions = transactions.filter(
      ({ value }) => !existingIds.has(value.TransactionID),
    );
    const newTransactionIds = newTransactions.map(
      ({ value }) => value.TransactionID,
    );
    const uniqueNewTransactionIds = new Set(newTransactionIds);
    const duplicateNewTransactionIds = [...uniqueNewTransactionIds].filter(
      (id) =>
        newTransactionIds.filter((candidate) => candidate === id).length > 1,
    );
    console.error("TRANSACTION INSERT DIAGNOSTICS");
    console.error({
      totalValidatedTransactions: transactions.length,
      totalNewTransactions: newTransactions.length,
      uniqueNewTransactionCount: uniqueNewTransactionIds.size,
      duplicateNewTransactionCount: duplicateNewTransactionIds.length,
      duplicateNewTransactionIds: duplicateNewTransactionIds.slice(0, 100),
      existingDatabaseTransactionCount: existingIds.size,
      existingDatabaseTransactionIds: [...existingIds].slice(0, 100),
    });
    const categoryNames = new Map<string, string>();
    for (const { value } of items)
      categoryNames.set(sourceKey(value.Category), value.Category);
    await tx.category.createMany({
      data: [...categoryNames].map(([sourceKeyValue, name]) => ({
        sourceKey: sourceKeyValue,
        name,
      })),
      skipDuplicates: true,
    });
    const categories = await tx.category.findMany({
      where: { sourceKey: { in: [...categoryNames.keys()] } },
      select: { id: true, sourceKey: true },
    });
    const categoryIds = new Map(
      categories.map((category) => [category.sourceKey, category.id]),
    );
    const productsByKey = new Map<
      string,
      { name: string; categoryId: string; price: number }
    >();
    for (const { value } of items) {
      const categoryId = categoryIds.get(sourceKey(value.Category));
      if (!categoryId)
        throw new Error(`Category not found for ${value.Category}.`);
      productsByKey.set(sourceKey(value.Category, value.ProductName), {
        name: value.ProductName,
        categoryId,
        price: value.UnitPrice,
      });
    }
    await tx.product.createMany({
      data: [...productsByKey].map(([sourceKeyValue, product]) => ({
        sourceKey: sourceKeyValue,
        name: product.name,
        categoryId: product.categoryId,
        currentPrice: product.price,
      })),
      skipDuplicates: true,
    });
    const products = await tx.product.findMany({
      where: { sourceKey: { in: [...productsByKey.keys()] } },
      select: { id: true, sourceKey: true },
    });
    const productIds = new Map(
      products.map((product) => [product.sourceKey, product.id]),
    );

    for (const rows of chunk(newTransactions))
      await tx.transaction.createMany({
        data: rows.map(({ value }) => ({
          sourceTransactionId: value.TransactionID,
          invoiceNo: value.InvoiceNo,
          importBatchId: batchId,
          occurredAt: transactionOccurredAt(value.Date, value.Time),
          guestCount: value.GuestCount,
          orderType: value.OrderType,
          salesChannel: value.SalesChannel,
          grossSales: value.GrossSales,
          serviceCharge: value.ServiceCharge,
          discountType: value.DiscountType,
          discountAmount: value.DiscountAmount,
          amountDue: value.AmountDue,
          netSales: value.NetSales,
        })),
      });
    const storedTransactions = await tx.transaction.findMany({
      where: { sourceTransactionId: { in: sourceIds } },
      select: { id: true, sourceTransactionId: true },
    });
    const transactionIds = new Map(
      storedTransactions.map((transaction) => [
        transaction.sourceTransactionId,
        transaction.id,
      ]),
    );
    const itemData = items.map(({ rowNumber, value }) => {
      const transactionId = transactionIds.get(value.TransactionID);
      const productId = productIds.get(
        sourceKey(value.Category, value.ProductName),
      );
      if (!transactionId || !productId)
        throw new Error(`Cannot resolve product item on CSV row ${rowNumber}.`);
      return {
        transactionId,
        productId,
        importBatchId: batchId,
        sourceRow: rowNumber,
        quantity: value.Qty,
        unitPrice: value.UnitPrice,
        salesAmount: value.SalesAmount,
      };
    });
    const paymentData = payments.map(({ rowNumber, value }) => {
      const transactionId = transactionIds.get(value.TransactionID);
      if (!transactionId)
        throw new Error(`Cannot resolve payment on CSV row ${rowNumber}.`);
      return {
        transactionId,
        importBatchId: batchId,
        sourceRow: rowNumber,
        paymentMethod: value.PaymentMethod,
        paymentProvider: value.PaymentProvider,
        amount: value.Amount,
      };
    });
    let importedItems = 0;
    let importedPayments = 0;
    for (const rows of chunk(itemData))
      importedItems += (
        await tx.transactionItem.createMany({
          data: rows,
          skipDuplicates: true,
        })
      ).count;
    for (const rows of chunk(paymentData))
      importedPayments += (
        await tx.payment.createMany({ data: rows, skipDuplicates: true })
      ).count;
    await tx.importBatch.update({
      where: { id: batchId },
      data: {
        status: "COMPLETED",
        processedRows: totalRows,
        importedTransactions: newTransactions.length,
        importedItems,
        importedPayments,
        skippedTransactions: existingIds.size,
        completedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        action: "POS_IMPORT_COMPLETED",
        entityType: "ImportBatch",
        entityId: batchId,
        metadata: {
          importedTransactions: newTransactions.length,
          importedItems,
          importedPayments,
          skippedTransactions: existingIds.size,
        },
      },
    });
    return {
      batchId,
      importedTransactions: newTransactions.length,
      importedItems,
      importedPayments,
      skippedTransactions: existingIds.size,
    };
  }
}
