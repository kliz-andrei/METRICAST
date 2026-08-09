import { api } from './api-client';

export interface ReportMetadata {
  availableDateRange: { startDate: string | null; endDate: string | null };
  salesChannels: string[];
  orderTypes: string[];
  categories: Array<{ id: string; name: string }>;
}

export const reportsApi = {
  metadata: () => api.get<ReportMetadata>('/reports/metadata').then((response) => response.data)
};
