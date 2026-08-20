import { api } from './api-client';

export type ImportErrorRecord = {
  id: string;
  sourceFile: string;
  rowNumber: number | null;
  field: string | null;
  message: string;
  rawData: unknown;
  createdAt: string;
};

export type ImportEntry = {
  id: string;
  sourceChecksum: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  transactionFile: string;
  productSalesFile: string;
  paymentsFile: string;
  totalRows: number;
  processedRows: number;
  importedTransactions: number;
  importedItems: number;
  importedPayments: number;
  skippedTransactions: number;
  errorCount: number;
  startedAt: string;
  completedAt: string | null;
  createdBy: { id: string; firstName: string; lastName: string; email: string } | null;
  errors: ImportErrorRecord[];
};

export type ImportOverview = {
  datasets: Array<{
    key: 'transactions' | 'productSales' | 'payments';
    name: string;
    recordCount: number;
    dateRange: { start: string | null; end: string | null };
    latestImport: Pick<ImportEntry, 'id' | 'status' | 'startedAt' | 'completedAt' | 'errorCount'> | null;
  }>;
};

export type ImportResult = {
  batchId: string;
  importedTransactions: number;
  importedItems: number;
  importedPayments: number;
  skippedTransactions: number;
  totalRows: number;
  failedRows: number;
};

const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export const importsApi = {
  list: () => api.get<{ data: ImportEntry[] }>('/imports').then(unwrap),
  overview: () => api.get<{ data: ImportOverview }>('/imports/overview').then(unwrap),
  detail: (id: string) => api.get<{ data: ImportEntry }>(`/imports/${id}`).then(unwrap),
  upload: (files: Record<'transactions' | 'productSales' | 'payments', File>) => {
    const form = new FormData();
    Object.entries(files).forEach(([key, file]) => form.append(key, file));
    return api
      .post<{ data: ImportResult }>('/import/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(unwrap);
  },
};
