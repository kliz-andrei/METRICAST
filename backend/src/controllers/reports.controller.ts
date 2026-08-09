import type { RequestHandler } from 'express';
import { ReportsService } from '../services/reports.service.js';

const service = new ReportsService();

export const metadata: RequestHandler = async (_request, response) => {
  response.json(await service.metadata());
};
