import { api } from "./api-client";

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
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED";
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
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  errors: ImportErrorRecord[];
};

export type ImportOverview = {
  datasets: Array<{
    key: "transactions" | "productSales" | "payments";
    name: string;
    recordCount: number;
    dateRange: { start: string | null; end: string | null };
    latestImport: Pick<
      ImportEntry,
      "id" | "status" | "startedAt" | "completedAt" | "errorCount"
    > | null;
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

export type ImportValidation = {
  ready: boolean;
  status: "READY_TO_IMPORT" | "READY_WITH_WARNINGS" | "IMPORT_BLOCKED";
  summary: {
    transactions: { total: number; unique: number; duplicates: number };
    productSales: { total: number; orphans: number };
    payments: { total: number; orphans: number };
    relationships: {
      transactionsWithoutProductSales: number;
      transactionsWithoutPayments: number;
    };
    duplicateImport: boolean;
  };
  dateCoverage: {
    transactions: {
      start: string | null;
      end: string | null;
      status: "AVAILABLE" | "UNKNOWN";
    };
    productSales: { start: null; end: null; status: "UNKNOWN" };
    payments: { start: null; end: null; status: "UNKNOWN" };
    comparison: "UNKNOWN";
  };
  reconciliation: {
    productSales: "UNAVAILABLE";
    payments: "UNAVAILABLE";
  };
  errors: Array<{
    sourceFile: string;
    rowNumber: number;
    field?: string;
    message: string;
    rawData: Record<string, string>;
  }>;
  warnings: Array<{ code: string; message: string; count: number }>;
};

export type ImportDeletionImpact = {
  batch: Pick<
    ImportEntry,
    | "id"
    | "status"
    | "transactionFile"
    | "productSalesFile"
    | "paymentsFile"
    | "startedAt"
    | "completedAt"
  >;
  affected: {
    transactions: number;
    transactionItems: number;
    payments: number;
    importErrors: number;
    importBatch: number;
  };
  safety: {
    canDelete: boolean;
    unsafeTransactionItems: number;
    unsafePayments: number;
    reason: string | null;
  };
  forecastWarning: boolean;
};

export type ImportDeletionResult = {
  removed: ImportDeletionImpact["affected"];
  forecastWarning: boolean;
};

const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

const uploadForm = (
  files: Record<"transactions" | "productSales" | "payments", File>,
) => {
  const form = new FormData();
  Object.entries(files).forEach(([key, file]) => form.append(key, file));
  return form;
};

export const importsApi = {
  list: () => api.get<{ data: ImportEntry[] }>("/imports").then(unwrap),
  overview: () =>
    api.get<{ data: ImportOverview }>("/imports/overview").then(unwrap),
  detail: (id: string) =>
    api.get<{ data: ImportEntry }>(`/imports/${id}`).then(unwrap),
  deletionImpact: (id: string) =>
    api
      .get<{ data: ImportDeletionImpact }>(`/imports/${id}/deletion-impact`)
      .then(unwrap),
  remove: (id: string, confirmation: string) =>
    api
      .delete<{ data: ImportDeletionResult }>(`/imports/${id}`, {
        data: { confirmation },
      })
      .then(unwrap),
  validate: (
    files: Record<"transactions" | "productSales" | "payments", File>,
  ) =>
    api
      .post<{ data: ImportValidation }>(
        "/imports/validate",
        uploadForm(files),
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      )
      .then(unwrap),
  upload: (
    files: Record<"transactions" | "productSales" | "payments", File>,
  ) => {
    return api
      .post<{ data: ImportResult }>("/import/upload", uploadForm(files), {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrap);
  },
};
