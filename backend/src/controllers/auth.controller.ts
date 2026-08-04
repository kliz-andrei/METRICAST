import type { RequestHandler } from 'express';
import { AuthService } from '../services/auth.service.js';

const auth = new AuthService();
export const register: RequestHandler = async (request, response) => response.status(201).json({ data: await auth.register(request.body) });
export const login: RequestHandler = async (request, response) => response.json({ data: await auth.login(request.body.email, request.body.password) });
export const refresh: RequestHandler = async (request, response) => response.json({ data: await auth.refresh(request.body.refreshToken) });
export const logout: RequestHandler = async (request, response) => { await auth.logout(request.body.refreshToken); response.status(204).send(); };
