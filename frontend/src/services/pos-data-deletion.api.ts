import { api } from './api-client';

export type PosDeletionRange = { startDate: string; endDate: string };
export type PosDeletionPreview = {
  range: PosDeletionRange;
  affected: {
    transactions: number;
    transactionItems: number;
    payments: number;
    importBatches: number;
    earliestTransactionDate: string | null;
    latestTransactionDate: string | null;
  };
  remaining: { transactions: number; transactionItems: number; payments: number };
  forecastWarning: boolean;
  previewToken: string;
  confirmationPhrase: string;
};
export type PosDeletionResult = {
  removed: { transactions: number; transactionItems: number; payments: number; importBatches: number };
  affectedImportBatches: number;
  forecastWarning: boolean;
};

const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export const posDataDeletionApi = {
  preview: (range: PosDeletionRange) =>
    api.post<{ data: PosDeletionPreview }>('/data-deletion/preview', range).then(unwrap),
  execute: (range: PosDeletionRange, previewToken: string, confirmation: string) =>
    api.post<{ data: PosDeletionResult }>('/data-deletion/execute', { ...range, previewToken, confirmation }).then(unwrap),
};
