import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { UserRepository } from '../repositories/user.repository.js';

type UserInput = {
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  password?: string;
  isActive?: boolean;
};

export class UserManagementService {
  constructor(private readonly users = new UserRepository()) {}

  async list() {
    return this.users.list();
  }

  async get(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new AppError(404, 'User not found.', 'NOT_FOUND');
    return user;
  }

  async create(input: Required<Pick<UserInput, 'email' | 'firstName' | 'lastName' | 'password'>> & { role?: UserRole }, actorId: string, ipAddress?: string) {
    if (await this.users.findByEmail(input.email)) {
      throw new AppError(409, 'An account with this email already exists.', 'EMAIL_EXISTS');
    }
    const user = await this.users.create({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role ?? UserRole.STAFF,
      passwordHash: await bcrypt.hash(input.password, 12),
    });
    await this.users.audit(actorId, 'USER_CREATED', 'User', user.id, ipAddress, { role: user.role });
    return user;
  }

  async update(id: string, input: UserInput, actorId: string, ipAddress?: string) {
    const current = await this.get(id);
    const nextRole = input.role ?? current.role;
    if (current.role === UserRole.ADMINISTRATOR && nextRole !== UserRole.ADMINISTRATOR && current.isActive) {
      await this.assertAdministratorCanBeChanged();
    }
    const { password, ...values } = input;
    const user = await this.users.update(id, {
      ...values,
      ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
    });
    if (current.role !== user.role) {
      await this.users.revokeAllRefreshTokens(id);
      await this.users.audit(actorId, 'USER_ROLE_CHANGED', 'User', id, ipAddress, { from: current.role, to: user.role });
    } else if (password) {
      await this.users.revokeAllRefreshTokens(id);
      await this.users.audit(actorId, 'ADMIN_PASSWORD_RESET', 'User', id, ipAddress);
    } else {
      await this.users.audit(actorId, 'USER_UPDATED', 'User', id, ipAddress);
    }
    return user;
  }

  async deactivate(id: string, actorId: string, ipAddress?: string) {
    if (id === actorId) throw new AppError(400, 'You cannot deactivate your own active account.', 'SELF_DEACTIVATION');
    const current = await this.get(id);
    if (!current.isActive) return current;
    if (current.role === UserRole.ADMINISTRATOR) await this.assertAdministratorCanBeChanged();
    const user = await this.users.deactivate(id);
    await this.users.revokeAllRefreshTokens(id);
    await this.users.audit(actorId, 'USER_DEACTIVATED', 'User', id, ipAddress);
    return user;
  }

  async reactivate(id: string, actorId: string, ipAddress?: string) {
    const current = await this.get(id);
    if (current.isActive) return current;
    const user = await this.users.reactivate(id);
    await this.users.audit(actorId, 'USER_REACTIVATED', 'User', id, ipAddress);
    return user;
  }

  private async assertAdministratorCanBeChanged() {
    if (await this.users.countActiveByRole(UserRole.ADMINISTRATOR) <= 1) {
      throw new AppError(400, 'The last active administrator cannot be removed or deactivated.', 'LAST_ADMINISTRATOR');
    }
  }
}
