import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { env } from '../config/env.js';
import { requireAuth, requireRole } from './auth.js';

describe('authentication middleware', () => {
  const secured = express();
  secured.get('/manager', requireAuth, requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER), (_request, response) => response.status(204).send());

  it('rejects missing access tokens', async () => {
    await request(secured).get('/manager').expect(401);
  });

  it('validates JWTs and enforces roles', async () => {
    const staff = jwt.sign({ role: UserRole.STAFF, type: 'access' }, env.JWT_ACCESS_SECRET, { subject: '726a4111-8f1c-4c3f-a534-d8c9ed4c8763', expiresIn: '15m' });
    const manager = jwt.sign({ role: UserRole.MANAGER, type: 'access' }, env.JWT_ACCESS_SECRET, { subject: '726a4111-8f1c-4c3f-a534-d8c9ed4c8763', expiresIn: '15m' });
    await request(secured).get('/manager').set('Authorization', `Bearer ${staff}`).expect(403);
    await request(secured).get('/manager').set('Authorization', `Bearer ${manager}`).expect(204);
  });
});
