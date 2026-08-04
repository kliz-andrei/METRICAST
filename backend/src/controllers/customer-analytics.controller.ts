import type { RequestHandler } from 'express';
import { CustomerAnalyticsService, type CustomerAnalyticsQuery } from '../services/customer-analytics.service.js';

const service = new CustomerAnalyticsService();

export const customerSummary: RequestHandler = async (request, response) => {
  const query: CustomerAnalyticsQuery = {
    startDate: typeof request.query.startDate === 'string' ? request.query.startDate : undefined,
    endDate: typeof request.query.endDate === 'string' ? request.query.endDate : undefined,
    salesChannel: typeof request.query.salesChannel === 'string' ? request.query.salesChannel : undefined,
    orderType: typeof request.query.orderType === 'string' ? request.query.orderType : undefined
  };

  response.json(await service.getAnalytics(query));
};
