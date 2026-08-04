import type { RequestHandler } from 'express';
import type { UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

type AccessPayload = { sub: string; role: UserRole; type: 'access' };

export const requireAuth: RequestHandler = (request, _response, next) => {
  const token = request.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new AppError(401, 'Authentication is required.', 'UNAUTHENTICATED'));
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
    if (payload.type !== 'access' || !payload.sub) throw new Error('Invalid access token.');
    request.auth = { userId: payload.sub, role: payload.role };
    return next();
  } catch {
    return next(new AppError(401, 'Access token is invalid or expired.', 'UNAUTHENTICATED'));
  }
};

export const requireRole = (...roles: UserRole[]): RequestHandler => (request, _response, next) => {
  if (!request.auth || !roles.includes(request.auth.role)) return next(new AppError(403, 'You do not have permission for this action.', 'FORBIDDEN'));
  return next();
};
