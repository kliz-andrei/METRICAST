import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

export const validate = (schema: ZodType, target: 'body' | 'params' | 'query' = 'body'): RequestHandler => (request, _response, next) => {
  const result = schema.safeParse(request[target]);
  if (!result.success) return next(result.error);
  Object.assign(request[target], result.data);
  return next();
};
