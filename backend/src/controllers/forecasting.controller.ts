import type { RequestHandler } from 'express';
import { ForecastingService, type ForecastQuery } from '../services/forecasting.service.js';

const service = new ForecastingService();

const queryFromRequest = (request: Parameters<RequestHandler>[0]): ForecastQuery => ({
  modelName: typeof request.query.modelName === 'string' ? request.query.modelName : undefined,
  granularity: typeof request.query.granularity === 'string' ? request.query.granularity : undefined,
  startDate: typeof request.query.startDate === 'string' ? request.query.startDate : undefined,
  endDate: typeof request.query.endDate === 'string' ? request.query.endDate : undefined,
  salesChannel: typeof request.query.salesChannel === 'string' ? request.query.salesChannel : undefined,
  orderType: typeof request.query.orderType === 'string' ? request.query.orderType : undefined,
  limit: typeof request.query.limit === 'string' ? request.query.limit : undefined
});

export const models: RequestHandler = async (_request, response) => {
  response.json(await service.getModels());
};

export const history: RequestHandler = async (request, response) => {
  response.json(await service.getHistory(queryFromRequest(request)));
};

export const latest: RequestHandler = async (request, response) => {
  response.json(await service.getLatest(queryFromRequest(request)));
};

export const sales: RequestHandler = async (request, response) => {
  const granularity = typeof request.query.granularity === 'string' ? request.query.granularity : undefined;
  response.json(await service.getSalesForecast(granularity));
};

export const guests: RequestHandler = async (request, response) => {
  const granularity = typeof request.query.granularity === 'string' ? request.query.granularity : undefined;
  response.json(await service.getGuestForecast(granularity));
};

export const transactions: RequestHandler = async (request, response) => {
  const granularity = typeof request.query.granularity === 'string' ? request.query.granularity : undefined;
  response.json(await service.getTransactionForecast(granularity));
};

export const products: RequestHandler = async (request, response) => {
  response.json(await service.getProductForecast(queryFromRequest(request)));
};

export const categories: RequestHandler = async (request, response) => {
  response.json(await service.getCategoryForecast(queryFromRequest(request)));
};

export const accuracy: RequestHandler = async (_request, response) => {
  response.json(await service.getAccuracy());
};
export const netSales: RequestHandler = async (request, response) => { response.json(await service.getNetSalesForecast(typeof request.query.horizon === 'string' ? request.query.horizon : undefined)); };
export const generateNetSales: RequestHandler = async (request, response) => { response.json(await service.getNetSalesForecast(typeof request.body?.horizon === 'number' || typeof request.body?.horizon === 'string' ? String(request.body.horizon) : undefined)); };
export const generateTransactions: RequestHandler = async (request, response) => { response.json(await service.getTransactionVolumeForecast(typeof request.body?.horizon === 'number' || typeof request.body?.horizon === 'string' ? String(request.body.horizon) : undefined)); };
export const generateGuests: RequestHandler = async (request, response) => { response.json(await service.getGuestCountForecast(typeof request.body?.horizon === 'number' || typeof request.body?.horizon === 'string' ? String(request.body.horizon) : undefined)); };
export const demandProducts: RequestHandler = async (_request, response) => { response.json(await service.getForecastProducts()); };
export const generateProductDemand: RequestHandler = async (request, response) => { const productId = typeof request.params.productId === 'string' ? request.params.productId : ''; response.json(await service.getProductDemandForecast(productId, typeof request.body?.horizon === 'number' || typeof request.body?.horizon === 'string' ? String(request.body.horizon) : undefined)); };
