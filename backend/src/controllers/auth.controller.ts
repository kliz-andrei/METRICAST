import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { AuthService } from '../services/auth.service.js';

const auth = new AuthService();
const refreshCookie = (response: Parameters<RequestHandler>[1], token: string, expiresAt: Date) => response.cookie(env.JWT_REFRESH_COOKIE_NAME, token, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict', expires: expiresAt, path: '/api/v1/auth' });
const clearRefreshCookie = (response: Parameters<RequestHandler>[1]) => response.clearCookie(env.JWT_REFRESH_COOKIE_NAME, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/v1/auth' });
const clientIp = (request: Parameters<RequestHandler>[0]) => request.ip;

export const register: RequestHandler = async (request, response) => response.status(201).json({ data: await auth.register(request.body) });
export const login: RequestHandler = async (request, response) => { const result = await auth.login(request.body.email, request.body.password, clientIp(request)); refreshCookie(response, result.refreshToken, result.refreshTokenExpiresAt); response.json({ data: { user: result.user, accessToken: result.accessToken, accessTokenExpiresIn: result.accessTokenExpiresIn } }); };
export const refresh: RequestHandler = async (request, response) => { const token = request.cookies?.[env.JWT_REFRESH_COOKIE_NAME] ?? request.body.refreshToken; if (!token) throw new AppError(401, 'Refresh token is required.', 'INVALID_REFRESH_TOKEN'); const result = await auth.refresh(token, clientIp(request)); refreshCookie(response, result.refreshToken, result.refreshTokenExpiresAt); response.json({ data: { user: result.user, accessToken: result.accessToken, accessTokenExpiresIn: result.accessTokenExpiresIn } }); };
export const logout: RequestHandler = async (request, response) => { const token = request.cookies?.[env.JWT_REFRESH_COOKIE_NAME] ?? request.body.refreshToken; if (token) await auth.logout(token, request.auth!.userId, clientIp(request)); clearRefreshCookie(response); response.status(204).send(); };
export const me: RequestHandler = async (request, response) => response.json({ data: await auth.currentUser(request.auth!.userId) });
export const changePassword: RequestHandler = async (request, response) => { await auth.changePassword(request.auth!.userId, request.body.currentPassword, request.body.newPassword, clientIp(request)); clearRefreshCookie(response); response.status(204).send(); };
export const forgotPassword: RequestHandler = async (request, response) => { const resetToken = await auth.requestPasswordReset(request.body.email, clientIp(request)); response.status(202).json({ data: { message: 'If that account exists, password-reset instructions have been issued.', ...(env.NODE_ENV !== 'production' && resetToken ? { resetToken } : {}) } }); };
export const resetPassword: RequestHandler = async (request, response) => { await auth.resetPassword(request.body.resetToken, request.body.newPassword, clientIp(request)); clearRefreshCookie(response); response.status(204).send(); };
