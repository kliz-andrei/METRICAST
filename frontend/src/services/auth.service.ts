import { api, setAccessToken } from './api-client';
import type { AuthUser, LoginResponse } from '../types/auth';
export const authService = {
  async login(email: string, password: string) { const { data } = await api.post<{ data: LoginResponse }>('/auth/login', { email, password }); setAccessToken(data.data.accessToken); return data.data; },
  async me() { const { data } = await api.get<{ data: AuthUser }>('/auth/me'); return data.data; },
  async refresh() { const { data } = await api.post<{ data: LoginResponse }>('/auth/refresh', {}); setAccessToken(data.data.accessToken); return data.data; },
  async logout() { try { await api.post('/auth/logout', {}); } finally { setAccessToken(null); } }
};
