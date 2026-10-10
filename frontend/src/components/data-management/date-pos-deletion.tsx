import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { AlertTriangle, CalendarDays, CheckCircle2, Info, LoaderCircle, Trash2 } from 'lucide-react';
import { posDataDeletionApi, type PosDeletionPreview, type PosDeletionRange } from '../../services/pos-data-deletion.api';

const formatNumber = (value: number) => value.toLocaleString('en-PH');
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(value)) : '—';
const apiErrorMessage = (error: unknown) => isAxiosError<{ error?: { message?: string } }>(error)
  ? error.response?.data?.error?.message ?? error.message
  : error instanceof Error ? error.message : 'Unable to complete the request.';
const monthRange = (value: string): PosDeletionRange | null => {
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { startDate: `${value}-01`, endDate: `${value}-${String(lastDay).padStart(2, '0')}` };
};

function Impact({ preview }: { preview: PosDeletionPreview }) {
  return (
    <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-sm dark:border-rose-950 dark:bg-rose-950/20">
      <p className="font-semibold text-slate-950 dark:text-white">Deletion impact</p>
      <p className="mt-1 text-slate-600 dark:text-slate-300">{preview.range.startDate} to {preview.range.endDate}</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-xs text-slate-500">Transactions</dt><dd className="mt-1 font-semibold">{formatNumber(preview.affected.transactions)}</dd></div>
        <div><dt className="text-xs text-slate-500">Transaction items</dt><dd className="mt-1 font-semibold">{formatNumber(preview.affected.transactionItems)}</dd></div>
        <div><dt className="text-xs text-slate-500">Payments</dt><dd className="mt-1 font-semibold">{formatNumber(preview.affected.payments)}</dd></div>
        <div><dt className="text-xs text-slate-500">Affected import batches</dt><dd className="mt-1 font-semibold">{formatNumber(preview.affected.importBatches)}</dd></div>
      </dl>
      <p className="mt-4 text-xs text-slate-600 dark:text-slate-300">Recorded transaction dates: {formatDate(preview.affected.earliestTransactionDate)} – {formatDate(preview.affected.latestTransactionDate)}</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">After deletion: {formatNumber(preview.remaining.transactions)} transactions, {formatNumber(preview.remaining.transactionItems)} items, and {formatNumber(preview.remaining.payments)} payments remain.</p>
      {preview.forecastWarning ? <p className="mt-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"><Info className="size-4 shrink-0" />Existing forecasts are preserved, but their historical evaluation may no longer be reproducible after POS data is removed.</p> : null}
    </div>
  );
}

export function DatePosDeletion({ canDelete }: { canDelete: boolean }) {
  const [mode, setMode] = useState<'month' | 'range'>('month');
  const [month, setMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preview, setPreview] = useState<PosDeletionPreview | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const selectedRange = mode === 'month' ? monthRange(month) : startDate && endDate ? { startDate, endDate } : null;
  const previewMutation = useMutation({
    mutationFn: (range: PosDeletionRange) => posDataDeletionApi.preview(range),
    onSuccess: (data) => { setPreview(data); setConfirmation(''); setMessage(data.affected.transactions ? null : 'No records were found for the selected date range.'); },
    onError: (error) => { setPreview(null); setMessage(apiErrorMessage(error)); },
  });
  const executeMutation = useMutation({
    mutationFn: () => posDataDeletionApi.execute(preview!.range, preview!.previewToken, confirmation),
    onSuccess: (result) => {
      setMessage(`Deleted ${formatNumber(result.removed.transactions)} transactions and related POS records.`);
      setPreview(null);
      setConfirmation('');
      void queryClient.invalidateQueries();
    },
    onError: (error) => { setMessage(apiErrorMessage(error)); },
  });
  const busy = previewMutation.isPending || executeMutation.isPending;
  const phraseMatches = preview?.confirmationPhrase === confirmation;

  return (
    <section className="rounded-2xl border border-rose-200/80 bg-white p-5 shadow-sm dark:border-rose-950 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200"><Trash2 className="size-5" /></span><div><h2 className="font-semibold text-slate-950 dark:text-white">Delete POS Data by Date</h2><p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Permanently remove transactions and their related Product Sales and Payments records for a selected period. Import history and reference data are retained.</p></div></div>
        <span className="w-fit rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-200">Administrator only</span>
      </div>
      {!canDelete ? <p className="mt-5 flex gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300"><Info className="mt-0.5 size-4 shrink-0" />Only Administrators can preview or permanently delete POS data.</p> : <>
        <fieldset disabled={busy} className="mt-5"><legend className="sr-only">Date selection</legend><div className="flex flex-wrap gap-3"><button type="button" onClick={() => { setMode('month'); setPreview(null); }} className={`rounded-lg border px-3 py-2 text-sm font-medium ${mode === 'month' ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-100' : 'border-slate-300 dark:border-slate-700'}`}>Specific month</button><button type="button" onClick={() => { setMode('range'); setPreview(null); }} className={`rounded-lg border px-3 py-2 text-sm font-medium ${mode === 'range' ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-100' : 'border-slate-300 dark:border-slate-700'}`}>Custom date range</button></div>
          {mode === 'month' ? <label className="mt-4 block max-w-xs text-sm font-semibold text-slate-900 dark:text-slate-100">Month<input aria-label="Month to delete" type="month" value={month} onChange={(event) => { setMonth(event.target.value); setPreview(null); }} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label> : <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Start date<input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPreview(null); }} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><label className="text-sm font-semibold text-slate-900 dark:text-slate-100">End date<input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPreview(null); }} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label></div>}
        </fieldset>
        <button type="button" disabled={!selectedRange || busy} onClick={() => selectedRange && previewMutation.mutate(selectedRange)} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40"><CalendarDays className="size-4" />{previewMutation.isPending ? 'Previewing…' : 'Preview Deletion'}</button>
        {preview ? <><Impact preview={preview} />{preview.affected.transactions > 0 ? <div className="mt-5 rounded-xl border border-rose-200 p-4 dark:border-rose-900"><p className="flex gap-2 text-sm text-rose-800 dark:text-rose-200"><AlertTriangle className="size-4 shrink-0" />This action cannot be undone. The scope will be rechecked immediately before deletion.</p><label className="mt-4 block text-sm font-semibold text-slate-900 dark:text-slate-100">Type <span className="break-all font-mono text-xs">{preview.confirmationPhrase}</span> to confirm<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" /></label><button type="button" disabled={!phraseMatches || busy} onClick={() => executeMutation.mutate()} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="size-4" />{executeMutation.isPending ? <><LoaderCircle className="size-4 animate-spin" />Deleting selected data…</> : 'Delete Selected Data'}</button></div> : null}</> : null}
      </>}
      {message ? <p className={`mt-4 flex gap-2 rounded-xl p-3 text-sm ${message.startsWith('Deleted') ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'}`}>{message.startsWith('Deleted') ? <CheckCircle2 className="size-4 shrink-0" /> : <Info className="size-4 shrink-0" />}{message}</p> : null}
    </section>
  );
}
