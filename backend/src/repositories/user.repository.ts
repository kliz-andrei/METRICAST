import type { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../database/client.js';

export class UserRepository {
  findByEmail(email: string) { return prisma.user.findFirst({ where: { email, deletedAt: null } }); }
  findById(id: string) { return prisma.user.findFirst({ where: { id, deletedAt: null } }); }
  list() { return prisma.user.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } }); }
  create(data: Prisma.UserCreateInput) { return prisma.user.create({ data }); }
  update(id: string, data: Prisma.UserUpdateInput) { return prisma.user.update({ where: { id }, data }); }
  deactivate(id: string) { return this.update(id, { isActive: false, deletedAt: new Date() }); }
  createRefreshToken(data: Prisma.RefreshTokenUncheckedCreateInput) { return prisma.refreshToken.create({ data }); }
  findRefreshToken(tokenHash: string) { return prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } }); }
  revokeRefreshToken(tokenHash: string) { return prisma.refreshToken.update({ where: { tokenHash }, data: { revokedAt: new Date() } }); }
  revokeRefreshTokenIfActive(tokenHash: string) { return prisma.refreshToken.updateMany({ where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } }, data: { revokedAt: new Date() } }); }
  revokeAllRefreshTokens(userId: string) { return prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }); }
  createPasswordResetToken(data: Prisma.PasswordResetTokenUncheckedCreateInput) { return prisma.passwordResetToken.create({ data }); }
  findPasswordResetToken(tokenHash: string) { return prisma.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } }); }
  consumePasswordResetToken(id: string) { return prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } }); }
  invalidatePasswordResetTokens(userId: string) { return prisma.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } }); }
  audit(actorId: string | null, action: string, entityType: string, entityId: string | null, ipAddress?: string, metadata?: Prisma.InputJsonValue) { return prisma.auditLog.create({ data: { actorId, action, entityType, entityId, ipAddress, metadata } }); }
  role(role: UserRole) { return role; }
}
