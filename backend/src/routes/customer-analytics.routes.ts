import { Router } from 'express';
import { customerSummary } from '../controllers/customer-analytics.controller.js';
import { asyncHandler } from '../lib/async-handler.js';

const customerAnalyticsRoutes = Router();

customerAnalyticsRoutes.get('/customer', asyncHandler(customerSummary));

export default customerAnalyticsRoutes;
