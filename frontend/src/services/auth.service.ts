import { api, setAccessToken } from './api-client';
import type { AuthUser, LoginResponse } from '../types/auth';
export const authService = {
  clearSession() { setAccessToken(null); },
  async login(email: string, password: string) { const { data } = await api.post<{ data: LoginResponse }>('/auth/login', { email, password }); setAccessToken(data.data.accessToken); return data.data; },
  async me() { const { data } = await api.get<{ data: AuthUser }>('/auth/me'); return data.data; },
  async refresh() { const { data } = await api.post<{ data: LoginResponse }>('/auth/refresh', {}); setAccessToken(data.data.accessToken); return data.data; },
  async changePassword(currentPassword: string, newPassword: string, passwordConfirmation: string) { await api.post('/auth/change-password', { currentPassword, newPassword, passwordConfirmation }); setAccessToken(null); },
  async logout() { try { await api.post('/auth/logout', {}); } finally { setAccessToken(null); } }
};
