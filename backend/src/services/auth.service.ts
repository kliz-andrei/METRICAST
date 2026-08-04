import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { UserRepository } from '../repositories/user.repository.js';

type PublicUser = { id: string; email: string; firstName: string; lastName: string; role: UserRole; isActive: boolean };
export const publicUser = (user: { id: string; email: string; firstName: string; lastName: string; role: UserRole; isActive: boolean }): PublicUser => ({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, isActive: user.isActive });
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

  async login(email: string, password: string, ipAddress?: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      await this.users.audit(user?.id ?? null, 'LOGIN_FAILED', 'User', user?.id ?? null, ipAddress, { email });
      throw new AppError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
    }
    const tokens = await this.issueTokens(user);
    await this.users.update(user.id, { lastLoginAt: new Date() });
    await this.users.audit(user.id, 'LOGIN_SUCCEEDED', 'User', user.id, ipAddress);
    return { user: publicUser(user), ...tokens };
  }

  async refresh(refreshToken: string, ipAddress?: string) {
    const stored = await this.users.findRefreshToken(tokenHash(refreshToken));
    if (!stored || stored.revokedAt || stored.expiresAt <= new Date() || !stored.user.isActive || stored.user.deletedAt) throw new AppError(401, 'Refresh token is invalid or expired.', 'INVALID_REFRESH_TOKEN');
    const revoked = await this.users.revokeRefreshTokenIfActive(stored.tokenHash);
    if (revoked.count !== 1) throw new AppError(401, 'Refresh token has already been used.', 'INVALID_REFRESH_TOKEN');
    const tokens = await this.issueTokens(stored.user);
    await this.users.audit(stored.user.id, 'TOKEN_REFRESHED', 'User', stored.user.id, ipAddress);
    return { user: publicUser(stored.user), ...tokens };
  }

  async logout(refreshToken: string, actorId: string, ipAddress?: string) {
    const stored = await this.users.findRefreshToken(tokenHash(refreshToken));
    if (stored && !stored.revokedAt) await this.users.revokeRefreshToken(stored.tokenHash);
    await this.users.audit(actorId, 'LOGOUT_SUCCEEDED', 'User', actorId, ipAddress);
  }

  async currentUser(userId: string) {
    const user = await this.users.findById(userId);
    if (!user || !user.isActive) throw new AppError(401, 'User is not active.', 'UNAUTHENTICATED');
    return publicUser(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, ipAddress?: string) {
    const user = await this.users.findById(userId);
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      await this.users.audit(userId, 'PASSWORD_CHANGE_FAILED', 'User', userId, ipAddress);
      throw new AppError(401, 'Current password is incorrect.', 'INVALID_CREDENTIALS');
    }
    await this.users.update(user.id, { passwordHash: await bcrypt.hash(newPassword, 12) });
    await this.users.revokeAllRefreshTokens(user.id);
    await this.users.audit(user.id, 'PASSWORD_CHANGED', 'User', user.id, ipAddress);
  }

  async requestPasswordReset(email: string, ipAddress?: string): Promise<string | null> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) return null;
    await this.users.invalidatePasswordResetTokens(user.id);
    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60_000);
    await this.users.createPasswordResetToken({ userId: user.id, tokenHash: tokenHash(token), expiresAt });
    await this.users.audit(user.id, 'PASSWORD_RESET_REQUESTED', 'User', user.id, ipAddress);
    return token;
  }

  async resetPassword(resetToken: string, newPassword: string, ipAddress?: string) {
    const stored = await this.users.findPasswordResetToken(tokenHash(resetToken));
    if (!stored || stored.usedAt || stored.expiresAt <= new Date() || !stored.user.isActive || stored.user.deletedAt) throw new AppError(400, 'Reset token is invalid or expired.', 'INVALID_RESET_TOKEN');
    await this.users.update(stored.user.id, { passwordHash: await bcrypt.hash(newPassword, 12) });
    await this.users.consumePasswordResetToken(stored.id);
    await this.users.revokeAllRefreshTokens(stored.user.id);
    await this.users.audit(stored.user.id, 'PASSWORD_RESET_COMPLETED', 'User', stored.user.id, ipAddress);
  }

  private async issueTokens(user: { id: string; role: UserRole }) {
    const accessToken = jwt.sign({ role: user.role, type: 'access' }, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'] });
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 86_400_000);
    await this.users.createRefreshToken({ userId: user.id, tokenHash: tokenHash(refreshToken), expiresAt });
    return { accessToken, refreshToken, accessTokenExpiresIn: env.JWT_ACCESS_TTL, refreshTokenExpiresAt: expiresAt };
  }
}
