import type { RequestHandler } from 'express';
import { UserManagementService } from '../services/user-management.service.js';

const users = new UserManagementService();
const shape = (user: { id: string; email: string; firstName: string; lastName: string; role: string; isActive: boolean; lastLoginAt: Date | null; createdAt: Date; updatedAt: Date }) => ({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, isActive: user.isActive, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt, updatedAt: user.updatedAt });
const clientIp = (request: Parameters<RequestHandler>[0]) => request.ip;
export const listUsers: RequestHandler = async (_request, response) => response.json({ data: (await users.list()).map(shape) });
export const getUser: RequestHandler = async (request, response) => response.json({ data: shape(await users.get(request.params.id as string)) });
export const createUser: RequestHandler = async (request, response) => {
  const user = await users.create(request.body, request.auth!.userId, clientIp(request));
  response.status(201).json({ data: shape(user) });
};
export const updateUser: RequestHandler = async (request, response) => {
  const user = await users.update(request.params.id as string, request.body, request.auth!.userId, clientIp(request));
  response.json({ data: shape(user) });
};
export const deactivateUser: RequestHandler = async (request, response) => response.json({ data: shape(await users.deactivate(request.params.id as string, request.auth!.userId, clientIp(request))) });
export const reactivateUser: RequestHandler = async (request, response) => response.json({ data: shape(await users.reactivate(request.params.id as string, request.auth!.userId, clientIp(request))) });
export const deleteUser = deactivateUser;
