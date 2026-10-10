import type { RequestHandler } from 'express';
import { PosDataDeletionService } from '../services/pos-data-deletion.service.js';

const service = new PosDataDeletionService();
const rangeFromRequest = (request: Parameters<RequestHandler>[0]) => ({
  startDate: request.body.startDate as string,
  endDate: request.body.endDate as string,
});

export const preview: RequestHandler = async (request, response) => {
  response.json({ data: await service.preview(rangeFromRequest(request)) });
};

export const execute: RequestHandler = async (request, response) => {
  response.json({
    data: await service.execute(
      rangeFromRequest(request),
      request.body.previewToken,
      request.body.confirmation,
      request.auth!.userId,
    ),
  });
};
