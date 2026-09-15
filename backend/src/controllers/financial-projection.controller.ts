import type { RequestHandler } from 'express';
import {
  FinancialProjectionService,
  type FinancialProjectionQuery,
} from '../services/financial-projection.service.js';

const service = new FinancialProjectionService();

const queryFromRequest = (request: Parameters<RequestHandler>[0]): FinancialProjectionQuery => ({
  startDate: typeof request.query.startDate === 'string' ? request.query.startDate : undefined,
  endDate: typeof request.query.endDate === 'string' ? request.query.endDate : undefined,
  salesChannel: typeof request.query.salesChannel === 'string' ? request.query.salesChannel : undefined,
  salesChannels: typeof request.query.salesChannels === 'string'
    ? request.query.salesChannels.split(',').map((value) => value.trim()).filter(Boolean)
    : Array.isArray(request.query.salesChannels)
      ? request.query.salesChannels.filter((value): value is string => typeof value === 'string')
      : undefined,
  orderType: typeof request.query.orderType === 'string' ? request.query.orderType : undefined,
  horizon: typeof request.query.horizon === 'string' ? request.query.horizon : undefined,
});

export const summary: RequestHandler = async (request, response) => {
  response.json(await service.getSummary(queryFromRequest(request)));
};

export const coverage: RequestHandler = async (request, response) => {
  response.json(await service.getCoverage(queryFromRequest(request)));
};

export const settings: RequestHandler = async (_request, response) => {
  response.json(await service.getSettings());
};

export const updateSettings: RequestHandler = async (request, response) => {
  response.json(await service.updateSettings(request.body.overheadRate));
};

export const products: RequestHandler = async (_request, response) => {
  response.json(await service.getProducts());
};

export const updateProductCost: RequestHandler = async (request, response) => {
  const id = typeof request.params.id === 'string' ? request.params.id : '';
  response.json(await service.updateProductCost(id, request.body.unitCost));
};
