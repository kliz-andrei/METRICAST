import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  constructor(public readonly statusCode: number, message: string, public readonly code = 'REQUEST_FAILED') {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  void next;
  console.error('UNHANDLED API ERROR');
  console.error(error);
  if (error instanceof ZodError) return response.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed.', details: error.flatten() } });
  if (error instanceof AppError) return response.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return response.status(409).json({ error: { code: 'DUPLICATE_RECORD', message: 'A record with this unique value already exists.' } });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return response.status(404).json({ error: { code: 'NOT_FOUND', message: 'The requested record was not found.' } });
  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  return response.status(500).json({ error: { code: 'INTERNAL_ERROR', message } });
};
