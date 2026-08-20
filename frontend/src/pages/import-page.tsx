import { isAxiosError } from 'axios';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  FileSpreadsheet,
  FileUp,
  Info,
  LoaderCircle,
  PackageCheck,
  ReceiptText,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/ui/states';
import { useAuth } from '../contexts/auth-context';
import { importKeys, useImportDetail, useImportHistory, useImportOverview } from '../hooks/use-imports';
import { importsApi, type ImportEntry, type ImportErrorRecord, type ImportResult } from '../services/imports.api';

const fileKeys = ['transactions', 'productSales', 'payments'] as const;
type FileKey = (typeof fileKeys)[number];
type SelectedFiles = Partial<Record<FileKey, File>>;

const DATASET_CONFIG: Record<FileKey, { label: string; filename: string; description: string; icon: typeof ReceiptText }> = {
  transactions: {
    label: 'Transactions',
    filename: 'Transactions.csv',
    description: 'Sale-level records, dates, guests, channels, and totals.',
    icon: ReceiptText,
  },
  productSales: {
    label: 'Product Sales',
    filename: 'ProductSales.csv',
    description: 'Transaction items linked to products and categories.',
    icon: PackageCheck,
  },
  payments: {
    label: 'Payments',
    filename: 'Payments.csv',
    description: 'Payment allocations, methods, providers, and amounts.',
    icon: Users,
  },
};

const formatNumber = (value: number) => new Intl.NumberFormat('en-PH').format(value);
const formatDateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : 'Not available';
const formatDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(value)) : 'No date range available';
const formatFileSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;

const statusLabel = (status: ImportEntry['status']) => {
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'FAILED') return 'Failed';
  return 'In progress';
};

function StatusBadge({ status, errors = 0 }: { status: ImportEntry['status']; errors?: number }) {
  const completedWithWarnings = status === 'COMPLETED' && errors > 0;
  const tone = completedWithWarnings
    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
    : status === 'COMPLETED'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
      : status === 'FAILED'
        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200'
        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  const label = completedWithWarnings ? 'Completed with warnings' : statusLabel(status);

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 ${className}`}>{children}</section>;
}

function DatasetOverview() {
  const overview = useImportOverview();

  if (overview.isLoading) {
    return <div className="grid gap-4 md:grid-cols-3">{fileKeys.map((key) => <LoadingSkeleton key={key} className="h-48 rounded-2xl" />)}</div>;
  }
  if (overview.isError) return <ErrorState title="Unable to load dataset status" message="Please refresh the page to try again." />;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {overview.data?.datasets.map((dataset) => {
        const config = DATASET_CONFIG[dataset.key];
        const Icon = config.icon;
        const quality = dataset.latestImport?.errorCount ? 'Needs review' : dataset.recordCount > 0 ? 'Ready for analytics' : 'No imported records';
        return (
          <Card key={dataset.key}>
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"><Icon className="size-5" aria-hidden="true" /></span>
              {dataset.latestImport ? <StatusBadge status={dataset.latestImport.status} errors={dataset.latestImport.errorCount} /> : null}
            </div>
            <h3 className="mt-4 font-semibold text-slate-950 dark:text-white">{dataset.name}</h3>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{formatNumber(dataset.recordCount)}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Imported records</p>
            <dl className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between gap-4"><dt>Date range</dt><dd className="text-right font-medium">{dataset.dateRange.start && dataset.dateRange.end ? `${formatDate(dataset.dateRange.start)} – ${formatDate(dataset.dateRange.end)}` : 'No date range available'}</dd></div>
              <div className="flex justify-between gap-4"><dt>Data status</dt><dd className="text-right font-medium">{quality}</dd></div>
              <div className="flex justify-between gap-4"><dt>Latest import</dt><dd className="text-right font-medium">{formatDateTime(dataset.latestImport?.completedAt ?? dataset.latestImport?.startedAt ?? null)}</dd></div>
            </dl>
          </Card>
        );
      })}
    </div>
  );
}

function UploadField({ fileKey, file, disabled, onSelect, onRemove }: { fileKey: FileKey; file?: File; disabled: boolean; onSelect: (file: File) => void; onRemove: () => void }) {
  const config = DATASET_CONFIG[fileKey];
  const Icon = config.icon;
  return (
    <div className="rounded-xl border border-dashed border-emerald-800/30 bg-emerald-50/30 p-4 transition hover:border-emerald-700/60 dark:border-emerald-500/30 dark:bg-emerald-950/20">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-emerald-800 shadow-sm dark:bg-slate-900 dark:text-emerald-300"><Icon className="size-4" aria-hidden="true" /></span>
        <label className="min-w-0 flex-1 cursor-pointer" aria-label={`Choose ${config.filename}`}>
          <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{config.filename}</span>
          <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{file ? `${file.name} · ${formatFileSize(file.size)}` : config.description}</span>
          <input className="sr-only" type="file" accept=".csv,text/csv" disabled={disabled} onChange={(event) => { const selected = event.target.files?.[0]; if (selected) onSelect(selected); event.currentTarget.value = ''; }} />
        </label>
        {file ? <button type="button" aria-label={`Remove ${config.filename}`} disabled={disabled} onClick={onRemove} className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 dark:hover:bg-slate-800"><X className="size-4" aria-hidden="true" /></button> : <FileUp className="size-4 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />}
      </div>
    </div>
  );
}

function apiErrorMessage(error: unknown) {
  if (isAxiosError<{ error?: { message?: string } }>(error)) return error.response?.data?.error?.message ?? error.message;
  return error instanceof Error ? error.message : 'The import could not be completed. Please try again.';
}

function ImportUpload({ onCompleted }: { onCompleted: (result: ImportResult) => void }) {
  const [files, setFiles] = useState<SelectedFiles>({});
  const [error, setError] = useState<string | null>(null);
  const client = useQueryClient();
  const ready = fileKeys.every((key) => files[key]);
  const upload = useMutation({
    mutationFn: () => importsApi.upload(files as Record<FileKey, File>),
    onSuccess: (result) => {
      setFiles({});
      setError(null);
      client.invalidateQueries({ queryKey: importKeys.all });
      onCompleted(result);
    },
    onError: (cause) => setError(apiErrorMessage(cause)),
  });

  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><Upload className="size-5" aria-hidden="true" /></span>
        <div>
          <h2 className="font-semibold text-slate-950 dark:text-white">Import POS data</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Upload the three related Under the Balete CSV exports together. They are validated as one transaction-safe batch.</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">{fileKeys.map((fileKey) => <UploadField key={fileKey} fileKey={fileKey} file={files[fileKey]} disabled={upload.isPending} onSelect={(file) => setFiles((current) => ({ ...current, [fileKey]: file }))} onRemove={() => setFiles((current) => ({ ...current, [fileKey]: undefined }))} />)}</div>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <div className="flex gap-2"><Info className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" /><p>METRICAST checks file headers, row values, transaction relationships, and the combined-file checksum before data is committed. Duplicate batches are rejected without creating duplicate records.</p></div>
      </div>
      {error ? <div className="mt-4"><ErrorState title="Import not completed" message={error} /></div> : null}
      <Button className="mt-5 w-full" disabled={!ready || upload.isPending} onClick={() => upload.mutate()}>
        {upload.isPending ? <><LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />Validating and importing…</> : <><Upload className="mr-2 size-4" aria-hidden="true" />Import POS batch</>}
      </Button>
      <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">{ready ? 'Ready for server-side validation.' : `Select all ${fileKeys.length} required CSV files to continue.`}</p>
    </Card>
  );
}

function ReadOnlyImportNotice() {
  return <Card><div className="flex gap-3"><Info className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" /><div><h2 className="font-semibold text-slate-950 dark:text-white">Read-only import access</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Staff can review dataset status, import history, and validation results. Only Administrators and Managers can upload POS files.</p></div></div></Card>;
}

function ImportResultCard({ result, onDismiss }: { result: ImportResult; onDismiss: () => void }) {
  const inserted = result.importedTransactions + result.importedItems + result.importedPayments;
  return <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" /><div><h2 className="font-semibold text-slate-950 dark:text-white">Import completed</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">The validated POS batch was committed successfully.</p></div></div><button aria-label="Dismiss import summary" onClick={onDismiss} className="rounded p-1 text-slate-500 hover:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 dark:hover:bg-slate-900"><X className="size-4" /></button></div><dl className="mt-4 grid gap-3 sm:grid-cols-4"><div><dt className="text-xs text-slate-500">Transactions</dt><dd className="mt-1 font-semibold">{formatNumber(result.importedTransactions)}</dd></div><div><dt className="text-xs text-slate-500">Product rows</dt><dd className="mt-1 font-semibold">{formatNumber(result.importedItems)}</dd></div><div><dt className="text-xs text-slate-500">Payment rows</dt><dd className="mt-1 font-semibold">{formatNumber(result.importedPayments)}</dd></div><div><dt className="text-xs text-slate-500">Skipped transactions</dt><dd className="mt-1 font-semibold">{formatNumber(result.skippedTransactions)}</dd></div></dl><p className="mt-3 text-xs text-slate-500">{formatNumber(inserted)} records inserted across the validated batch.</p></Card>;
}

function ImportHistory({ onSelect }: { onSelect: (id: string) => void }) {
  const history = useImportHistory();
  if (history.isLoading) return <LoadingSkeleton className="h-80 rounded-2xl" />;
  if (history.isError) return <ErrorState title="Unable to load import history" message="Please refresh the page to try again." />;
  if (!history.data?.length) return <Card><EmptyState title="No import history yet" message="Import a complete POS batch to establish the first record." /></Card>;

  return <Card><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-950 dark:text-white">Import history</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Recent POS batches and their validation outcome.</p></div><span className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatNumber(history.data.length)} batch{history.data.length === 1 ? '' : 'es'}</span></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400"><tr><th className="pb-3 font-medium">Batch / files</th><th className="pb-3 font-medium">Status</th><th className="pb-3 text-right font-medium">Processed</th><th className="pb-3 text-right font-medium">Issues</th><th className="pb-3 font-medium">Imported</th><th className="pb-3" aria-label="View details" /></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{history.data.map((entry) => <tr key={entry.id} className="text-slate-700 dark:text-slate-200"><td className="max-w-64 py-4"><p className="truncate font-medium">{entry.transactionFile}</p><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{entry.productSalesFile} · {entry.paymentsFile}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(entry.completedAt ?? entry.startedAt)}</p></td><td className="py-4"><StatusBadge status={entry.status} errors={entry.errorCount} /></td><td className="py-4 text-right">{formatNumber(entry.processedRows)} / {formatNumber(entry.totalRows)}</td><td className="py-4 text-right">{entry.errorCount > 0 ? <span className="font-semibold text-rose-700 dark:text-rose-300">{formatNumber(entry.errorCount)}</span> : '—'}</td><td className="py-4 text-xs">{formatNumber(entry.importedTransactions)} txns<br />{formatNumber(entry.importedItems)} items · {formatNumber(entry.importedPayments)} payments</td><td className="py-4 text-right"><button onClick={() => onSelect(entry.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-emerald-300 dark:hover:bg-emerald-950/50">Details <ChevronRight className="size-3" /></button></td></tr>)}</tbody></table></div></Card>;
}

function offendingValue(error: ImportErrorRecord) {
  if (!error.field || !error.rawData || typeof error.rawData !== 'object' || Array.isArray(error.rawData)) return null;
  const value = (error.rawData as Record<string, unknown>)[error.field];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : null;
}

function ImportDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const detail = useImportDetail(id);
  if (detail.isLoading) return <LoadingSkeleton className="h-80 rounded-2xl" />;
  if (detail.isError || !detail.data) return <ErrorState title="Unable to load import details" message="Please select the import again." onRetry={() => void detail.refetch()} />;
  const entry = detail.data;
  const imported = entry.importedTransactions + entry.importedItems + entry.importedPayments;
  return <Card className="border-emerald-200/80 dark:border-emerald-900"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Import details</p><h2 className="mt-1 font-semibold text-slate-950 dark:text-white">{entry.transactionFile}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Started {formatDateTime(entry.startedAt)}{entry.createdBy ? ` by ${entry.createdBy.firstName} ${entry.createdBy.lastName}` : ''}</p></div><button aria-label="Close import details" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:hover:bg-slate-800"><X className="size-4" /></button></div><div className="mt-4 flex flex-wrap gap-2"><StatusBadge status={entry.status} errors={entry.errorCount} />{entry.errorCount > 0 ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-200"><CircleAlert className="size-3" />{formatNumber(entry.errorCount)} validation issue{entry.errorCount === 1 ? '' : 's'}</span> : null}</div><dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-xs text-slate-500">Processed</dt><dd className="mt-1 font-semibold">{formatNumber(entry.processedRows)} / {formatNumber(entry.totalRows)}</dd></div><div><dt className="text-xs text-slate-500">Inserted</dt><dd className="mt-1 font-semibold">{formatNumber(imported)}</dd></div><div><dt className="text-xs text-slate-500">Skipped transactions</dt><dd className="mt-1 font-semibold">{formatNumber(entry.skippedTransactions)}</dd></div><div><dt className="text-xs text-slate-500">Completed</dt><dd className="mt-1 font-semibold">{formatDateTime(entry.completedAt)}</dd></div></dl><div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-900"><p className="font-medium text-slate-900 dark:text-slate-100">Files in this batch</p><ul className="mt-2 space-y-1 text-slate-600 dark:text-slate-300"><li>{entry.transactionFile}</li><li>{entry.productSalesFile}</li><li>{entry.paymentsFile}</li></ul></div>{entry.errors.length ? <div className="mt-5"><h3 className="font-semibold text-slate-950 dark:text-white">Validation errors</h3><div className="mt-3 max-h-72 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[620px] text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400"><tr><th className="p-3">File</th><th className="p-3">Row</th><th className="p-3">Field</th><th className="p-3">Problem</th><th className="p-3">Value</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{entry.errors.map((error) => <tr key={error.id}><td className="p-3">{error.sourceFile}</td><td className="p-3">{error.rowNumber ?? '—'}</td><td className="p-3">{error.field ?? '—'}</td><td className="p-3">{error.message}</td><td className="max-w-40 truncate p-3">{offendingValue(error) ?? '—'}</td></tr>)}</tbody></table></div></div> : <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"><CheckCircle2 className="size-4" />No validation errors were recorded for this batch.</div>}</Card>;
}

export function ImportPage() {
  const { user } = useAuth();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedImport, setSelectedImport] = useState<string | null>(null);
  const canUpload = user?.role === 'ADMINISTRATOR' || user?.role === 'MANAGER';

  return <section className="space-y-6"><header><p className="text-sm font-medium text-amber-700 dark:text-amber-300">Under the Balete</p><div className="mt-2 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300"><Database className="size-5" /></span><div><h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Data Management</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Monitor imported POS datasets, validation outcomes, and safe batch ingestion.</p></div></div></header><DatasetOverview />{result ? <ImportResultCard result={result} onDismiss={() => setResult(null)} /> : null}<div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">{canUpload ? <ImportUpload onCompleted={setResult} /> : <ReadOnlyImportNotice />}<Card><h2 className="font-semibold text-slate-950 dark:text-white">How POS data connects</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The three exports are validated together to preserve relational integrity.</p><div className="mt-5 space-y-3 text-sm"><div className="flex items-center gap-3"><FileSpreadsheet className="size-4 text-emerald-700 dark:text-emerald-300" /><span><strong>Transactions</strong> establishes each sale record.</span></div><div className="ml-2 border-l border-dashed border-emerald-600/40 pl-5"><div className="flex items-center gap-3"><PackageCheck className="size-4 text-amber-700 dark:text-amber-300" /><span><strong>Product Sales</strong> becomes transaction items, products, and categories.</span></div></div><div className="ml-2 border-l border-dashed border-emerald-600/40 pl-5"><div className="flex items-center gap-3"><Users className="size-4 text-emerald-700 dark:text-emerald-300" /><span><strong>Payments</strong> is linked to its transaction.</span></div></div></div><div className="mt-5 flex gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300"><AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-300" />Rows with invalid fields or missing transaction relationships are logged to Import History and are not committed as a successful batch.</div></Card></div>{selectedImport ? <ImportDetail id={selectedImport} onClose={() => setSelectedImport(null)} /> : null}<ImportHistory onSelect={setSelectedImport} /></section>;
}
