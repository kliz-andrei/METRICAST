import { Router } from 'express';
import { accuracy, categories, generateGuests, generateNetSales, generateTransactions, guests, history, latest, models, netSales, products, sales, transactions } from '../controllers/forecasting.controller.js';
import { asyncHandler } from '../lib/async-handler.js';

const forecastingRoutes = Router();

forecastingRoutes.get('/models', asyncHandler(models));
forecastingRoutes.get('/history', asyncHandler(history));
forecastingRoutes.get('/latest', asyncHandler(latest));
forecastingRoutes.get('/sales', asyncHandler(sales));
forecastingRoutes.get('/guests', asyncHandler(guests));
forecastingRoutes.get('/transactions', asyncHandler(transactions));
forecastingRoutes.get('/products', asyncHandler(products));
forecastingRoutes.get('/categories', asyncHandler(categories));
forecastingRoutes.get('/accuracy', asyncHandler(accuracy));
forecastingRoutes.get('/net-sales', asyncHandler(netSales));
forecastingRoutes.post('/net-sales/generate', asyncHandler(generateNetSales));
forecastingRoutes.post('/transactions/generate', asyncHandler(generateTransactions));
forecastingRoutes.post('/guests/generate', asyncHandler(generateGuests));

export default forecastingRoutes;
