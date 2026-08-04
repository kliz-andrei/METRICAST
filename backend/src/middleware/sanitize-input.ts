import type { RequestHandler } from 'express';

const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);

const sanitize = (value: unknown): unknown => {
  if (typeof value === 'string') return [...value].filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127).join('').trim();
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !forbiddenKeys.has(key)).map(([key, child]) => [key, sanitize(child)]));
  }
  return value;
};

export const sanitizeInput: RequestHandler = (request, _response, next) => {
  if (request.body && typeof request.body === 'object') request.body = sanitize(request.body);
  next();
};
