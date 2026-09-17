import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { CustomerFeedbackService } from '../services/customer-feedback.service.js';

const service = new CustomerFeedbackService();
const file = (request: Parameters<RequestHandler>[0]) => { const upload = request.file; if (!upload) throw new AppError(422, 'Upload Customer Feedback Rating.csv.', 'MISSING_FEEDBACK_FILE'); if (!upload.originalname.toLowerCase().endsWith('.csv')) throw new AppError(422, 'Customer Feedback must be a CSV file.', 'INVALID_FILE_TYPE'); return upload; };
export const validate: RequestHandler = async (request, response) => { const upload = file(request); response.json({ data: await service.preview(upload.buffer, upload.originalname) }); };
export const upload: RequestHandler = async (request, response) => { const selected = file(request); response.status(201).json({ data: await service.import(selected.buffer, selected.originalname, request.auth!.userId) }); };
export const overview: RequestHandler = async (_request, response) => response.json({ data: await service.overview() });
export const imports: RequestHandler = async (_request, response) => response.json({ data: await service.imports() });
export const remove: RequestHandler = async (request, response) => response.json({ data: await service.delete(request.params.id as string, request.auth!.userId) });
export const analytics: RequestHandler = async (request, response) => response.json({ data: await service.analytics(typeof request.query.startDate === 'string' ? request.query.startDate : undefined, typeof request.query.endDate === 'string' ? request.query.endDate : undefined) });
