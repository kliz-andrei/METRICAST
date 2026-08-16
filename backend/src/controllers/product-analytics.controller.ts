import type { RequestHandler } from 'express';
import { ProductAnalyticsService, type ProductAnalyticsQuery } from '../services/product-analytics.service.js';

const service = new ProductAnalyticsService();

export const products: RequestHandler = async (request, response) => {
  const query: ProductAnalyticsQuery = {
    startDate: typeof request.query.startDate === 'string' ? request.query.startDate : undefined,
    endDate: typeof request.query.endDate === 'string' ? request.query.endDate : undefined,
    salesChannel: typeof request.query.salesChannel === 'string' ? request.query.salesChannel : undefined,
    salesChannels: typeof request.query.salesChannels === 'string'
      ? request.query.salesChannels.split(',').map((value) => value.trim()).filter(Boolean)
      : Array.isArray(request.query.salesChannels)
        ? request.query.salesChannels.filter((value): value is string => typeof value === 'string')
        : undefined,
    orderType: typeof request.query.orderType === 'string' ? request.query.orderType : undefined
  };

  response.json(await service.getAnalytics(query));
};
