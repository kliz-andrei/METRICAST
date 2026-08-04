import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1', withCredentials: true, headers: { 'Content-Type': 'application/json' } });
let accessToken: string | null = sessionStorage.getItem('metricast_access_token');
export const setAccessToken = (token: string | null) => { accessToken = token; token ? sessionStorage.setItem('metricast_access_token', token) : sessionStorage.removeItem('metricast_access_token'); };
api.interceptors.request.use((config) => { if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`; return config; });
let refreshPromise: Promise<string | null> | null = null;
api.interceptors.response.use((response) => response, async (error) => {
  const request = error.config;
  if (error.response?.status !== 401 || request?._retry || request?.url?.includes('/auth/refresh')) return Promise.reject(error);
  request._retry = true;
  refreshPromise ??= api.post('/auth/refresh', {}).then(({ data }) => { const token = data.data.accessToken as string; setAccessToken(token); return token; }).catch(() => { setAccessToken(null); return null; }).finally(() => { refreshPromise = null; });
  const token = await refreshPromise;
  if (!token) return Promise.reject(error);
  request.headers.Authorization = `Bearer ${token}`;
  return api(request);
});
