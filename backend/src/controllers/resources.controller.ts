import type { RequestHandler } from 'express';
import { ResourceService } from '../services/resource.service.js';

const resources = new ResourceService();
const catalog = resources.catalogRepository;
const business = resources.businessRepository;

export const listCategories: RequestHandler = async (_request, response) => response.json({ data: await catalog.listCategories() });
export const getCategory: RequestHandler = async (request, response) => response.json({ data: await resources.category(request.params.id as string) });
export const createCategory: RequestHandler = async (request, response) => response.status(201).json({ data: await catalog.createCategory(request.body) });
export const updateCategory: RequestHandler = async (request, response) => { await resources.category(request.params.id as string); response.json({ data: await catalog.updateCategory(request.params.id as string, request.body) }); };
export const deleteCategory: RequestHandler = async (request, response) => { await resources.category(request.params.id as string); await catalog.deleteCategory(request.params.id as string); response.status(204).send(); };

export const listProducts: RequestHandler = async (_request, response) => response.json({ data: await catalog.listProducts() });
export const getProduct: RequestHandler = async (request, response) => response.json({ data: await resources.product(request.params.id as string) });
export const createProduct: RequestHandler = async (request, response) => response.status(201).json({ data: await catalog.createProduct(request.body) });
export const updateProduct: RequestHandler = async (request, response) => { await resources.product(request.params.id as string); response.json({ data: await catalog.updateProduct(request.params.id as string, request.body) }); };
export const deleteProduct: RequestHandler = async (request, response) => { await resources.product(request.params.id as string); await catalog.deleteProduct(request.params.id as string); response.status(204).send(); };

export const listCustomers: RequestHandler = async (_request, response) => response.json({ data: await business.listCustomers() });
export const getCustomer: RequestHandler = async (request, response) => response.json({ data: await resources.customer(request.params.id as string) });
export const createCustomer: RequestHandler = async (request, response) => response.status(201).json({ data: await business.createCustomer(request.body) });
export const updateCustomer: RequestHandler = async (request, response) => { await resources.customer(request.params.id as string); response.json({ data: await business.updateCustomer(request.params.id as string, request.body) }); };
export const deleteCustomer: RequestHandler = async (request, response) => { await resources.customer(request.params.id as string); await business.deleteCustomer(request.params.id as string); response.status(204).send(); };

export const listTransactions: RequestHandler = async (request, response) => { const page = Math.max(Number(request.query.page) || 1, 1); const pageSize = Math.min(Math.max(Number(request.query.pageSize) || 25, 1), 100); const sortBy = request.query.sortBy === 'netSales' || request.query.sortBy === 'guestCount' ? request.query.sortBy : 'occurredAt'; const sortOrder = request.query.sortOrder === 'asc' ? 'asc' : 'desc'; const date = (value: unknown, end = false) => typeof value === 'string' ? new Date(`${value}T${end ? '23:59:59.999' : '00:00:00'}+08:00`) : undefined; const salesChannels = typeof request.query.salesChannels === 'string' ? request.query.salesChannels.split(',').map(channel => channel.trim()).filter(Boolean) : undefined; const [transactions, total, summary] = await business.listTransactions({ page, pageSize, search: typeof request.query.search === 'string' ? request.query.search.trim() || undefined : undefined, startDate: date(request.query.startDate), endDate: date(request.query.endDate, true), orderType: typeof request.query.orderType === 'string' ? request.query.orderType || undefined : undefined, salesChannel: typeof request.query.salesChannel === 'string' ? request.query.salesChannel || undefined : undefined, salesChannels, sortBy, sortOrder }); response.json({ data: { transactions: transactions.map((transaction) => ({ ...transaction, grossSales: Number(transaction.grossSales), discountAmount: Number(transaction.discountAmount), serviceCharge: Number(transaction.serviceCharge), netSales: Number(transaction.netSales) })), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }, summary: { totalTransactions: summary._count.id, netSales: Number(summary._sum.netSales ?? 0), averageOrderValue: Number(summary._avg.netSales ?? 0), guests: Number(summary._sum.guestCount ?? 0) } } }); };
export const getTransaction: RequestHandler = async (request, response) => response.json({ data: await resources.transaction(request.params.id as string) });
export const createTransaction: RequestHandler = async (request, response) => response.status(201).json({ data: await business.createTransaction(request.body) });
export const updateTransaction: RequestHandler = async (request, response) => { await resources.transaction(request.params.id as string); response.json({ data: await business.updateTransaction(request.params.id as string, request.body) }); };
export const deleteTransaction: RequestHandler = async (request, response) => { await resources.transaction(request.params.id as string); await business.deleteTransaction(request.params.id as string); response.status(204).send(); };

export const listPayments: RequestHandler = async (_request, response) => response.json({ data: await business.listPayments() });
export const getPayment: RequestHandler = async (request, response) => response.json({ data: await resources.payment(request.params.id as string) });
export const createPayment: RequestHandler = async (request, response) => response.status(201).json({ data: await business.createPayment(request.body) });
export const updatePayment: RequestHandler = async (request, response) => { await resources.payment(request.params.id as string); response.json({ data: await business.updatePayment(request.params.id as string, request.body) }); };
export const deletePayment: RequestHandler = async (request, response) => { await resources.payment(request.params.id as string); await business.deletePayment(request.params.id as string); response.status(204).send(); };
