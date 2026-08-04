import type { RequestHandler } from 'express';
import { OperationalService, type OperationalQuery } from '../services/operational.service.js';

const service = new OperationalService();

export const operations: RequestHandler = async (request, response) => {
  const query: OperationalQuery = {
    startDate: typeof request.query.startDate === 'string' ? request.query.startDate : undefined,
    endDate: typeof request.query.endDate === 'string' ? request.query.endDate : undefined,
    salesChannel: typeof request.query.salesChannel === 'string' ? request.query.salesChannel : undefined,
    orderType: typeof request.query.orderType === 'string' ? request.query.orderType : undefined
  };

  response.json(await service.getAnalytics(query));
};
