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

export const listTransactions: RequestHandler = async (_request, response) => response.json({ data: await business.listTransactions() });
export const getTransaction: RequestHandler = async (request, response) => response.json({ data: await resources.transaction(request.params.id as string) });
export const createTransaction: RequestHandler = async (request, response) => response.status(201).json({ data: await business.createTransaction(request.body) });
export const updateTransaction: RequestHandler = async (request, response) => { await resources.transaction(request.params.id as string); response.json({ data: await business.updateTransaction(request.params.id as string, request.body) }); };
export const deleteTransaction: RequestHandler = async (request, response) => { await resources.transaction(request.params.id as string); await business.deleteTransaction(request.params.id as string); response.status(204).send(); };

export const listPayments: RequestHandler = async (_request, response) => response.json({ data: await business.listPayments() });
export const getPayment: RequestHandler = async (request, response) => response.json({ data: await resources.payment(request.params.id as string) });
export const createPayment: RequestHandler = async (request, response) => response.status(201).json({ data: await business.createPayment(request.body) });
export const updatePayment: RequestHandler = async (request, response) => { await resources.payment(request.params.id as string); response.json({ data: await business.updatePayment(request.params.id as string, request.body) }); };
export const deletePayment: RequestHandler = async (request, response) => { await resources.payment(request.params.id as string); await business.deletePayment(request.params.id as string); response.status(204).send(); };
