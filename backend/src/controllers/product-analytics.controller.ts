import type { RequestHandler } from 'express';
import { ProductAnalyticsService, type ProductAnalyticsQuery } from '../services/product-analytics.service.js';

const service = new ProductAnalyticsService();

export const products: RequestHandler = async (request, response) => {
  const query: ProductAnalyticsQuery = {
    startDate: typeof request.query.startDate === 'string' ? request.query.startDate : undefined,
    endDate: typeof request.query.endDate === 'string' ? request.query.endDate : undefined,
    salesChannel: typeof request.query.salesChannel === 'string' ? request.query.salesChannel : undefined,
    orderType: typeof request.query.orderType === 'string' ? request.query.orderType : undefined
  };

  response.json(await service.getAnalytics(query));
};
