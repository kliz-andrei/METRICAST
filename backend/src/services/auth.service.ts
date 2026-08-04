import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { UserRepository } from '../repositories/user.repository.js';

type PublicUser = { id: string; email: string; firstName: string; lastName: string; role: UserRole; isActive: boolean };
const publicUser = (user: { id: string; email: string; firstName: string; lastName: string; role: UserRole; isActive: boolean }): PublicUser => ({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, isActive: user.isActive });
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export class AuthService {
  constructor(private readonly users = new UserRepository()) {}

  async register(input: { email: string; password: string; firstName: string; lastName: string; role?: UserRole }) {
    if (await this.users.findByEmail(input.email)) throw new AppError(409, 'Email is already registered.', 'EMAIL_EXISTS');
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.users.create({ email: input.email, passwordHash, firstName: input.firstName, lastName: input.lastName, role: input.role ?? UserRole.STAFF });
    await this.users.audit(user.id, 'USER_REGISTERED', 'User', user.id);
    return publicUser(user);
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) throw new AppError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
    const tokens = await this.issueTokens(user);
    await this.users.update(user.id, { lastLoginAt: new Date() });
    await this.users.audit(user.id, 'USER_LOGGED_IN', 'User', user.id);
    return { user: publicUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    const stored = await this.users.findRefreshToken(tokenHash(refreshToken));
    if (!stored || stored.revokedAt || stored.expiresAt <= new Date() || !stored.user.isActive || stored.user.deletedAt) throw new AppError(401, 'Refresh token is invalid or expired.', 'INVALID_REFRESH_TOKEN');
    await this.users.revokeRefreshToken(stored.tokenHash);
    return { user: publicUser(stored.user), ...(await this.issueTokens(stored.user)) };
  }

  async logout(refreshToken: string) {
    const stored = await this.users.findRefreshToken(tokenHash(refreshToken));
    if (stored && !stored.revokedAt) await this.users.revokeRefreshToken(stored.tokenHash);
  }

  private async issueTokens(user: { id: string; role: UserRole }) {
    const accessToken = jwt.sign({ role: user.role, type: 'access' }, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'] });
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 86_400_000);
    await this.users.createRefreshToken({ userId: user.id, tokenHash: tokenHash(refreshToken), expiresAt });
    return { accessToken, refreshToken, accessTokenExpiresIn: env.JWT_ACCESS_TTL, refreshTokenExpiresAt: expiresAt };
  }
}
