import { z } from "zod";
import { UserRole } from "@prisma/client";

export const idParams = z.object({ id: z.string().uuid() });
export const deleteImportSchema = z.object({ confirmation: z.string().uuid() });
export const deleteAllCustomerFeedbackSchema = z.object({
  confirmation: z.literal("DELETE FEEDBACK"),
});
const isoBusinessDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Use a valid calendar date.");
const posDataDeletionRange = {
  startDate: isoBusinessDate,
  endDate: isoBusinessDate,
};
const chronologicalRange = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.refine((value) => value.startDate <= value.endDate, {
    path: ["endDate"],
    message: "End date must be on or after the start date.",
  });
export const posDataDeletionPreviewSchema = chronologicalRange(z.object(posDataDeletionRange));
export const posDataDeletionExecuteSchema = chronologicalRange(
  z.object({
    ...posDataDeletionRange,
    previewToken: z.string().regex(/^[a-f0-9]{64}$/i, "Preview the selected date range again before deleting."),
    confirmation: z.string().min(1).max(120),
  }),
);
const money = z.coerce.number().finite().nonnegative().multipleOf(0.01);
const nullableText = z.string().trim().min(1).nullable().optional();
const password = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/\d/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol.");
const passwordConfirmation = (schema: z.ZodRawShape) =>
  z
    .object(schema)
    .refine((value) => value.newPassword === value.passwordConfirmation, {
      path: ["passwordConfirmation"],
      message: "Passwords do not match.",
    });
export const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(128),
});
export const refreshSchema = z.object({
  refreshToken: z.string().min(32).optional(),
});
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(320),
});
export const resetPasswordSchema = passwordConfirmation({
  resetToken: z.string().min(32).max(256),
  newPassword: password,
  passwordConfirmation: z.string().min(1).max(128),
});
export const changePasswordSchema = passwordConfirmation({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
  passwordConfirmation: z.string().min(1).max(128),
});
export const userCreateSchema = z.object({
  email: z.string().email().max(320),
  password,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  role: z.nativeEnum(UserRole).optional(),
});
export const userUpdateSchema = userCreateSchema
  .omit({ password: true })
  .partial()
  .extend({ password: password.optional() });
export const categorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  sourceKey: z.string().trim().min(1).max(180),
});
export const productSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(180),
  sourceKey: z.string().trim().min(1).max(300),
  sku: nullableText,
  currentPrice: money.nullable().optional(),
  isActive: z.boolean().optional(),
});
export const customerSchema = z.object({
  externalRef: nullableText,
  firstName: nullableText,
  lastName: nullableText,
  email: z.string().email().nullable().optional(),
  phone: nullableText,
  dateOfBirth: z.coerce.date().nullable().optional(),
  notes: nullableText,
});
export const transactionSchema = z.object({
  sourceTransactionId: z.string().trim().min(1).max(100),
  invoiceNo: z.string().trim().min(1).max(100),
  customerId: z.string().uuid().nullable().optional(),
  occurredAt: z.coerce.date(),
  guestCount: z.coerce.number().int().positive().nullable().optional(),
  orderType: z.string().trim().min(1).max(100),
  salesChannel: z.string().trim().min(1).max(100),
  grossSales: money,
  serviceCharge: money.default(0),
  discountType: nullableText,
  discountAmount: money.default(0),
  amountDue: money,
  netSales: money,
});
export const paymentSchema = z.object({
  transactionId: z.string().uuid(),
  sourceRow: z.coerce.number().int().positive(),
  paymentMethod: z.string().trim().min(1).max(80),
  paymentProvider: nullableText,
  amount: money,
});
export const productCostSchema = z.object({
  unitCost: money.nullable(),
});
export const financialSettingsSchema = z.object({
  overheadRate: z.coerce.number().finite().min(0).max(100),
});
