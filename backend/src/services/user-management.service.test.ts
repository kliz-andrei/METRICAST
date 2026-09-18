import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '@prisma/client';
import { UserManagementService } from './user-management.service.js';
import type { UserRepository } from '../repositories/user.repository.js';

const administrator = { id: 'aa0d0d02-94fd-4442-bb1c-a7c04bf2f903', email: 'admin@underthebalete.com', firstName: 'Under', lastName: 'Balete', role: UserRole.ADMINISTRATOR, isActive: true, deletedAt: null, lastLoginAt: null, createdAt: new Date(), updatedAt: new Date() };
const repository = (administrators = 1) => ({
  findById: vi.fn(async () => administrator),
  findByEmail: vi.fn(async () => null),
  countActiveByRole: vi.fn(async () => administrators),
  deactivate: vi.fn(async () => ({ ...administrator, isActive: false })),
  reactivate: vi.fn(async () => administrator),
  revokeAllRefreshTokens: vi.fn(async () => ({ count: 1 })),
  audit: vi.fn(async () => ({})),
});

describe('UserManagementService', () => {
  it('prevents self-deactivation and removal of the last active administrator', async () => {
    const repo = repository();
    const service = new UserManagementService(repo as unknown as UserRepository);
    await expect(service.deactivate(administrator.id, administrator.id)).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.deactivate(administrator.id, 'bb0d0d02-94fd-4442-bb1c-a7c04bf2f903')).rejects.toMatchObject({ statusCode: 400 });
    expect(repo.deactivate).not.toHaveBeenCalled();
  });

  it('deactivates a non-final administrator and revokes sessions', async () => {
    const repo = repository(2);
    const service = new UserManagementService(repo as unknown as UserRepository);
    await service.deactivate(administrator.id, 'bb0d0d02-94fd-4442-bb1c-a7c04bf2f903');
    expect(repo.revokeAllRefreshTokens).toHaveBeenCalledWith(administrator.id);
    expect(repo.audit).toHaveBeenCalledWith('bb0d0d02-94fd-4442-bb1c-a7c04bf2f903', 'USER_DEACTIVATED', 'User', administrator.id, undefined);
  });
});
