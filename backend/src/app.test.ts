import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './app.js';

describe('API protection', () => {
  it('exposes health and OpenAPI while protecting business endpoints', async () => {
    await request(app).get('/health').expect(200, { status: 'ok' });
    const documentation = await request(app).get('/api/docs.json').expect(200);
    expect(documentation.body.paths['/auth/forgot-password']).toBeDefined();
    await request(app).get('/api/v1/products').expect(401);
  });
});
