import { api } from './api-client';
import type { UserRole } from '../types/auth';

export type ManagedUser = { id: string; email: string; firstName: string; lastName: string; role: UserRole; isActive: boolean; lastLoginAt: string | null; createdAt: string; updatedAt: string };
export type CreateUserInput = { email: string; firstName: string; lastName: string; role: UserRole; password: string };

export const usersApi = {
  async list() { return (await api.get<{ data: ManagedUser[] }>('/users')).data.data; },
  async create(input: CreateUserInput) { return (await api.post<{ data: ManagedUser }>('/users', input)).data.data; },
  async update(id: string, input: Partial<Omit<CreateUserInput, 'password'>> & { password?: string }) { return (await api.patch<{ data: ManagedUser }>(`/users/${id}`, input)).data.data; },
  async deactivate(id: string) { return (await api.post<{ data: ManagedUser }>(`/users/${id}/deactivate`)).data.data; },
  async reactivate(id: string) { return (await api.post<{ data: ManagedUser }>(`/users/${id}/reactivate`)).data.data; },
};
