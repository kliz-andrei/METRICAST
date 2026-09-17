import { api } from './api-client';

export interface FeedbackPreview { filename: string; totalRows: number; dateRange: { start: string; end: string }; sampleRows: Array<Record<string, string>>; duplicate: boolean; }
export interface FeedbackOverview { id: string; records: number; filename: string; latestImport: string; status: 'READY_FOR_CUSTOMER_TRENDS'; }
const form = (file: File) => { const data = new FormData(); data.append('feedback', file); return data; };
export const customerFeedbackApi = {
  preview: async (file: File) => (await api.post<{ data: FeedbackPreview }>('/customer-feedback/validate', form(file), { headers: { 'Content-Type': 'multipart/form-data' } })).data.data,
  import: async (file: File) => (await api.post('/customer-feedback/import', form(file), { headers: { 'Content-Type': 'multipart/form-data' } })).data.data,
  overview: async () => (await api.get<{ data: FeedbackOverview | null }>('/customer-feedback/overview')).data.data,
  remove: async (id: string) => (await api.delete(`/customer-feedback/imports/${id}`)).data.data,
};
