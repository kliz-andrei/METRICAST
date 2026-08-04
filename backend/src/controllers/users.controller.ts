import type { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import { AppError } from '../lib/errors.js';
import { UserRepository } from '../repositories/user.repository.js';

const users = new UserRepository();
const shape = (user: { id: string; email: string; firstName: string; lastName: string; role: string; isActive: boolean; createdAt: Date; updatedAt: Date }) => ({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, isActive: user.isActive, createdAt: user.createdAt, updatedAt: user.updatedAt });
export const listUsers: RequestHandler = async (_request, response) => response.json({ data: (await users.list()).map(shape) });
export const getUser: RequestHandler = async (request, response) => { const user = await users.findById(request.params.id as string); if (!user) throw new AppError(404, 'User not found.', 'NOT_FOUND'); response.json({ data: shape(user) }); };
export const createUser: RequestHandler = async (request, response) => {
  if (await users.findByEmail(request.body.email)) throw new AppError(409, 'Email is already registered.', 'EMAIL_EXISTS');
  const user = await users.create({ ...request.body, passwordHash: await bcrypt.hash(request.body.password, 12), password: undefined });
  await users.audit(request.auth?.userId ?? null, 'USER_CREATED', 'User', user.id);
  response.status(201).json({ data: shape(user) });
};
export const updateUser: RequestHandler = async (request, response) => {
  const { password, ...values } = request.body;
  const current = await users.findById(request.params.id as string);
  if (!current) throw new AppError(404, 'User not found.', 'NOT_FOUND');
  const user = await users.update(current.id, { ...values, ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}) });
  await users.audit(request.auth?.userId ?? null, 'USER_UPDATED', 'User', user.id);
  response.json({ data: shape(user) });
};
export const deleteUser: RequestHandler = async (request, response) => { await users.deactivate(request.params.id as string); await users.revokeAllRefreshTokens(request.params.id as string); response.status(204).send(); };
