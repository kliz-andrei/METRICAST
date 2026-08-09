import type { RequestHandler } from 'express';
import { SalesAnalyticsService, type SalesFilter } from '../services/sales-analytics.service.js';

const service = new SalesAnalyticsService();
const filters = (request: Parameters<RequestHandler>[0]): SalesFilter => ({ ...request.query, salesChannels: typeof request.query.salesChannels === 'string' ? request.query.salesChannels.split(',').map((channel) => channel.trim()).filter(Boolean) : undefined } as SalesFilter);

export const summary: RequestHandler = async (request, response) => response.json({ data: await service.summary(filters(request)) });
export const dayOfWeek: RequestHandler = async (request, response) => response.json({ data: await service.dayOfWeek(filters(request)) });
export const daily: RequestHandler = async (request, response) => response.json({ data: await service.bucket(filters(request), 'day') });
export const monthly: RequestHandler = async (request, response) => response.json({ data: await service.bucket(filters(request), 'month') });
export const hourly: RequestHandler = async (request, response) => response.json({ data: await service.bucket(filters(request), 'hour') });
export const channel: RequestHandler = async (request, response) => response.json({ data: await service.channel(filters(request)) });
export const orderType: RequestHandler = async (request, response) => response.json({ data: await service.orderType(filters(request)) });
export const discountDistribution: RequestHandler = async (request, response) => response.json({ data: await service.discountDistribution(filters(request)) });
