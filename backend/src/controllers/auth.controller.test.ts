import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '@prisma/client';
import { env } from '../config/env.js';

const service = vi.hoisted(() => ({
  login: vi.fn(async () => ({ user: { id: 'a9b42da3-d6b0-4678-b8d7-8f34d9060864', email: 'admin@underthebalete.com', firstName: 'Under the', lastName: 'Balete', role: 'ADMINISTRATOR', isActive: true }, accessToken: 'access-token', refreshToken: 'r'.repeat(64), accessTokenExpiresIn: '15m', refreshTokenExpiresAt: new Date(Date.now() + 60_000) })),
  refresh: vi.fn(async () => ({ user: { id: 'a9b42da3-d6b0-4678-b8f34d9060864', email: 'admin@underthebalete.com', firstName: 'Under the', lastName: 'Balete', role: 'ADMINISTRATOR', isActive: true }, accessToken: 'rotated-access-token', refreshToken: 's'.repeat(64), accessTokenExpiresIn: '15m', refreshTokenExpiresAt: new Date(Date.now() + 60_000) })),
  logout: vi.fn(async () => undefined),
  currentUser: vi.fn(async () => ({ id: 'a9b42da3-d6b0-4678-b8d7-8f34d9060864', email: 'admin@underthebalete.com', firstName: 'Under the', lastName: 'Balete', role: 'ADMINISTRATOR', isActive: true })),
  changePassword: vi.fn(async () => undefined),
  requestPasswordReset: vi.fn(async () => 't'.repeat(64)),
  resetPassword: vi.fn(async () => undefined),
  register: vi.fn()
}));

vi.mock('../services/auth.service.js', () => ({ AuthService: class { constructor() { return service; } } }));

const { app } = await import('../app.js');
const authorization = `Bearer ${jwt.sign({ role: UserRole.ADMINISTRATOR, type: 'access' }, env.JWT_ACCESS_SECRET, { subject: 'a9b42da3-d6b0-4678-b8d7-8f34d9060864', expiresIn: '15m' })}`;
const strongPassword = 'ValidPassword1!';

describe('authentication endpoints', () => {
  it('logs in and rotates refresh cookies', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'admin@underthebalete.com', password: strongPassword }).expect(200);
    expect(login.body.data.accessToken).toBe('access-token');
    expect(login.headers['set-cookie'][0]).toContain(env.JWT_REFRESH_COOKIE_NAME);
    await request(app).post('/api/v1/auth/refresh').set('Cookie', `${env.JWT_REFRESH_COOKIE_NAME}=${'r'.repeat(64)}`).send({}).expect(200);
    expect(service.refresh).toHaveBeenCalled();
  });

  it('supports current user, logout, password change, and recovery endpoints', async () => {
    await request(app).get('/api/v1/auth/me').set('Authorization', authorization).expect(200);
    await request(app).post('/api/v1/auth/logout').set('Authorization', authorization).send({ refreshToken: 'r'.repeat(64) }).expect(204);
    await request(app).post('/api/v1/auth/change-password').set('Authorization', authorization).send({ currentPassword: strongPassword, newPassword: 'AnotherPassword1!', passwordConfirmation: 'AnotherPassword1!' }).expect(204);
    await request(app).post('/api/v1/auth/forgot-password').send({ email: 'admin@underthebalete.com' }).expect(202);
    await request(app).post('/api/v1/auth/reset-password').send({ resetToken: 't'.repeat(64), newPassword: 'AnotherPassword1!', passwordConfirmation: 'AnotherPassword1!' }).expect(204);
  });
});
