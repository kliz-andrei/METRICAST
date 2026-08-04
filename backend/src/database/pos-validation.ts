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
const nonNegativeInteger = z.string().transform((value, context) => {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a non-negative whole number.' });
    return z.NEVER;
  }
  return amount;
});

const canonicalDate = z.string().transform((value, context) => {
  const trimmed = value.trim();
  let day: string;
  let month: string;
  let year: string;
  const delimited = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const compact = /^(\d{2})(\d{2})(\d{4})$/.exec(trimmed);
  if (delimited) [, day, month, year] = delimited;
  else if (iso) [, year, month, day] = iso;
  else if (compact) [, day, month, year] = compact;
  else { context.addIssue({ code: z.ZodIssueCode.custom, message: 'Expected DD/MM/YYYY, YYYY-MM-DD, or DDMMYYYY.' }); return z.NEVER; }
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(parsed.valueOf()) || parsed.getUTCFullYear() !== Number(year) || parsed.getUTCMonth() + 1 !== Number(month) || parsed.getUTCDate() !== Number(day)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Date is not a valid calendar date.' });
    return z.NEVER;
  }
  return `${day}/${month}/${year}`;
});

const canonicalTime = z.string().transform((value, context) => {
  const match = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) { context.addIssue({ code: z.ZodIssueCode.custom, message: 'Expected H:mm:ss or HH:mm:ss.' }); return z.NEVER; }
  const [, hour, minute, second] = match;
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) { context.addIssue({ code: z.ZodIssueCode.custom, message: 'Time is outside the valid 24-hour range.' }); return z.NEVER; }
  return `${hour.padStart(2, '0')}:${minute}:${second}`;
});

export const transactionRowSchema = z.object({
  TransactionID: requiredText,
  InvoiceNo: requiredText,
  Date: canonicalDate,
  Time: canonicalTime,
  GuestCount: nonNegativeInteger,
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
  Qty: nonNegativeInteger.pipe(z.number().positive('Must be a positive whole number.')),
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
