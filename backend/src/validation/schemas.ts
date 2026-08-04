import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const idParams = z.object({ id: z.string().uuid() });
const money = z.coerce.number().finite().nonnegative().multipleOf(0.01);
const nullableText = z.string().trim().min(1).nullable().optional();
export const loginSchema = z.object({ email: z.string().email().max(320), password: z.string().min(8).max(128) });
export const refreshSchema = z.object({ refreshToken: z.string().min(32) });
export const userCreateSchema = z.object({ email: z.string().email().max(320), password: z.string().min(12).max(128), firstName: z.string().trim().min(1).max(100), lastName: z.string().trim().min(1).max(100), role: z.nativeEnum(UserRole).optional() });
export const userUpdateSchema = userCreateSchema.omit({ password: true }).partial().extend({ password: z.string().min(12).max(128).optional(), isActive: z.boolean().optional() });
export const categorySchema = z.object({ name: z.string().trim().min(1).max(120), sourceKey: z.string().trim().min(1).max(180) });
export const productSchema = z.object({ categoryId: z.string().uuid(), name: z.string().trim().min(1).max(180), sourceKey: z.string().trim().min(1).max(300), sku: nullableText, currentPrice: money.nullable().optional(), isActive: z.boolean().optional() });
export const customerSchema = z.object({ externalRef: nullableText, firstName: nullableText, lastName: nullableText, email: z.string().email().nullable().optional(), phone: nullableText, dateOfBirth: z.coerce.date().nullable().optional(), notes: nullableText });
export const transactionSchema = z.object({ sourceTransactionId: z.string().trim().min(1).max(100), invoiceNo: z.string().trim().min(1).max(100), customerId: z.string().uuid().nullable().optional(), occurredAt: z.coerce.date(), guestCount: z.coerce.number().int().positive().nullable().optional(), orderType: z.string().trim().min(1).max(100), salesChannel: z.string().trim().min(1).max(100), grossSales: money, serviceCharge: money.default(0), discountType: nullableText, discountAmount: money.default(0), amountDue: money, netSales: money });
export const paymentSchema = z.object({ transactionId: z.string().uuid(), sourceRow: z.coerce.number().int().positive(), paymentMethod: z.string().trim().min(1).max(80), paymentProvider: nullableText, amount: money });
