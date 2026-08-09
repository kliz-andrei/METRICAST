import { Router } from 'express';
import * as controller from '../controllers/sales-analytics.controller.js';
import { asyncHandler } from '../lib/async-handler.js';

const router = Router();
router.get('/summary', asyncHandler(controller.summary));
router.get('/day-of-week', asyncHandler(controller.dayOfWeek));
router.get('/daily', asyncHandler(controller.daily));
router.get('/monthly', asyncHandler(controller.monthly));
router.get('/hourly', asyncHandler(controller.hourly));
router.get('/channel', asyncHandler(controller.channel));
router.get('/order-type', asyncHandler(controller.orderType));
router.get('/discount-distribution', asyncHandler(controller.discountDistribution));
export default router;
