import { Router } from 'express';
import { products } from '../controllers/product-analytics.controller.js';
import { asyncHandler } from '../lib/async-handler.js';

const productAnalyticsRoutes = Router();

productAnalyticsRoutes.get('/products', asyncHandler(products));

export default productAnalyticsRoutes;
