import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '@prisma/client';
import { env } from '../config/env.js';
import { AuthService } from './auth.service.js';
import type { UserRepository } from '../repositories/user.repository.js';

const user = { id: 'aa0d0d02-94fd-4442-bb1c-a7c04bf2f903', email: 'admin@underthebalete.com', firstName: 'Under the', lastName: 'Balete', role: UserRole.ADMINISTRATOR, isActive: true, deletedAt: null, passwordHash: await bcrypt.hash('ValidPassword1!', 4) };
const repository = () => ({
  findByEmail: vi.fn(async () => user),
  findById: vi.fn(async () => user),
  createRefreshToken: vi.fn(async () => ({})),
  findRefreshToken: vi.fn(async () => ({ tokenHash: 'hash', revokedAt: null, expiresAt: new Date(Date.now() + 60_000), user })),
  revokeRefreshToken: vi.fn(async () => ({})),
  revokeRefreshTokenIfActive: vi.fn(async () => ({ count: 1 })),
  revokeAllRefreshTokens: vi.fn(async () => ({ count: 1 })),
  invalidatePasswordResetTokens: vi.fn(async () => ({ count: 0 })),
  createPasswordResetToken: vi.fn(async () => ({})),
  findPasswordResetToken: vi.fn(async () => null),
  consumePasswordResetToken: vi.fn(async () => ({})),
  update: vi.fn(async () => user),
  audit: vi.fn(async () => ({}))
});

describe('AuthService', () => {
  it('hashes passwords and issues a verifiable JWT on login', async () => {
    const repo = repository();
    const service = new AuthService(repo as unknown as UserRepository);
    const result = await service.login(user.email, 'ValidPassword1!', '127.0.0.1');
    const payload = jwt.verify(result.accessToken, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
    expect(payload.sub).toBe(user.id);
    expect(payload.role).toBe(UserRole.ADMINISTRATOR);
    expect(result.refreshToken).toHaveLength(64);
    expect(await bcrypt.compare('ValidPassword1!', user.passwordHash)).toBe(true);
  });

  it('rotates refresh tokens and rejects failed credentials', async () => {
    const repo = repository();
    const service = new AuthService(repo as unknown as UserRepository);
    await expect(service.login(user.email, 'incorrect-password')).rejects.toMatchObject({ statusCode: 401 });
    await service.refresh('a'.repeat(64));
    expect(repo.revokeRefreshTokenIfActive).toHaveBeenCalledTimes(1);
    expect(repo.createRefreshToken).toHaveBeenCalledTimes(1);
  });
});
