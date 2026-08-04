import type { Prisma } from '@prisma/client';
import { prisma } from '../database/client.js';

export class BusinessRepository {
  listCustomers() { return prisma.customer.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } }); }
  customer(id: string) { return prisma.customer.findFirst({ where: { id, deletedAt: null }, include: { _count: { select: { transactions: true } } } }); }
  createCustomer(data: Prisma.CustomerCreateInput) { return prisma.customer.create({ data }); }
  updateCustomer(id: string, data: Prisma.CustomerUpdateInput) { return prisma.customer.update({ where: { id }, data }); }
  deleteCustomer(id: string) { return prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } }); }
  listTransactions() { return prisma.transaction.findMany({ where: { deletedAt: null }, include: { customer: true, items: { include: { product: true } }, payments: true }, orderBy: { occurredAt: 'desc' } }); }
  transaction(id: string) { return prisma.transaction.findFirst({ where: { id, deletedAt: null }, include: { customer: true, items: { include: { product: true } }, payments: true } }); }
  createTransaction(data: Prisma.TransactionUncheckedCreateInput) { return prisma.transaction.create({ data, include: { items: true, payments: true } }); }
  updateTransaction(id: string, data: Prisma.TransactionUncheckedUpdateInput) { return prisma.transaction.update({ where: { id }, data, include: { items: true, payments: true } }); }
  deleteTransaction(id: string) { return prisma.transaction.update({ where: { id }, data: { deletedAt: new Date() } }); }
  listPayments() { return prisma.payment.findMany({ include: { transaction: { select: { id: true, invoiceNo: true, occurredAt: true } } }, orderBy: { createdAt: 'desc' } }); }
  payment(id: string) { return prisma.payment.findUnique({ where: { id }, include: { transaction: true } }); }
  createPayment(data: Prisma.PaymentUncheckedCreateInput) { return prisma.payment.create({ data }); }
  updatePayment(id: string, data: Prisma.PaymentUncheckedUpdateInput) { return prisma.payment.update({ where: { id }, data }); }
  deletePayment(id: string) { return prisma.payment.delete({ where: { id } }); }
}
