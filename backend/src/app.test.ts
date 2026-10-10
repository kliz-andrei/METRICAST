import request from 'supertest';
import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { app } from './app.js';
import { env } from './config/env.js';

const accessToken = (role: UserRole) => `Bearer ${jwt.sign({ role, type: 'access' }, env.JWT_ACCESS_SECRET, { subject: 'a9b42da3-d6b0-4678-b8d7-8f34d9060864', expiresIn: '15m' })}`;

describe('API protection', () => {
  it('exposes health and OpenAPI while protecting business endpoints', async () => {
    await request(app).get('/health').expect(200, { status: 'ok' });
    const documentation = await request(app).get('/api/docs.json').expect(200);
    expect(documentation.body.paths['/auth/forgot-password']).toBeDefined();
    await request(app).get('/api/v1/products').expect(401);
    await request(app).get('/api/v1/financial-projections/summary').expect(401);
  });

  it('forwards legacy forecast URLs to the existing versioned route', async () => {
    await request(app)
      .get('/forecast/net-sales?horizon=7')
      .expect(307)
      .expect('Location', '/api/v1/forecast/net-sales?horizon=7');
  });

  it('protects Customer Feedback deletion and rejects invalid feedback import IDs', async () => {
    await request(app).delete('/api/v1/customer-feedback/all').set('Authorization', accessToken(UserRole.MANAGER)).send({ confirmation: 'DELETE FEEDBACK' }).expect(403);
    await request(app).delete('/api/v1/customer-feedback/imports/not-a-uuid').set('Authorization', accessToken(UserRole.ADMINISTRATOR)).expect(422);
  });

  it('protects date-based POS deletion and validates date ranges before execution', async () => {
    await request(app).post('/api/v1/data-deletion/preview').send({ startDate: '2026-08-01', endDate: '2026-08-31' }).expect(401);
    await request(app).post('/api/v1/data-deletion/preview').set('Authorization', accessToken(UserRole.MANAGER)).send({ startDate: '2026-08-01', endDate: '2026-08-31' }).expect(403);
    await request(app).post('/api/v1/data-deletion/preview').set('Authorization', accessToken(UserRole.ADMINISTRATOR)).send({ startDate: '2026-08-31', endDate: '2026-08-01' }).expect(422);
  });
});
