import { z } from 'zod';

const blankToNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed === '' || trimmed.toLowerCase() === 'nan' ? null : trimmed;
};

const requiredText = z.string().transform((value) => value.trim()).pipe(z.string().min(1));
const nullableText = z.string().transform(blankToNull);
const money = z.string().transform((value, context) => {
  const normalized = value.replace(/[^0-9.-]/g, '');
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a non-negative PHP currency amount.' });
    return z.NEVER;
  }
  return amount;
});
const positiveInteger = z.string().transform((value, context) => {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a positive whole number.' });
    return z.NEVER;
  }
  return amount;
});

export const transactionRowSchema = z.object({
  TransactionID: requiredText,
  InvoiceNo: requiredText,
  Date: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Expected DD/MM/YYYY.'),
  Time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Expected HH:mm:ss.'),
  GuestCount: positiveInteger,
  OrderType: requiredText,
  SalesChannel: requiredText,
  GrossSales: money,
  ServiceCharge: money,
  DiscountType: nullableText,
  DiscountAmount: money,
  AmountDue: money,
  NetSales: money
});

export const productSalesRowSchema = z.object({
  TransactionID: requiredText,
  ProductName: requiredText,
  Category: requiredText,
  Qty: positiveInteger,
  UnitPrice: money,
  SalesAmount: money
});

export const paymentRowSchema = z.object({
  TransactionID: requiredText,
  PaymentMethod: requiredText,
  PaymentProvider: nullableText,
  Amount: money
});

export type PosTransactionRow = z.infer<typeof transactionRowSchema>;
export type PosProductSalesRow = z.infer<typeof productSalesRowSchema>;
export type PosPaymentRow = z.infer<typeof paymentRowSchema>;

export const transactionOccurredAt = (date: string, time: string): Date => {
  const [day, month, year] = date.split('/');
  return new Date(`${year}-${month}-${day}T${time}+08:00`);
};

export const sourceKey = (...parts: string[]): string => parts
  .map((part) => part.trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' '))
  .join('::');
