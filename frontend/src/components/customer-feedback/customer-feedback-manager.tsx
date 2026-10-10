import { AlertTriangle, FileSpreadsheet, Trash2, Upload, Users } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../contexts/auth-context";
import {
  useCustomerFeedbackOverview,
  useDeleteAllCustomerFeedback,
  useImportCustomerFeedback,
  usePreviewCustomerFeedback,
} from "../../hooks/use-customer-feedback";

const date = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "—";
export function CustomerFeedbackManager() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const preview = usePreviewCustomerFeedback();
  const importer = useImportCustomerFeedback();
  const overview = useCustomerFeedbackOverview();
  const deletion = useDeleteAllCustomerFeedback();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const canImport = user?.role === "ADMINISTRATOR" || user?.role === "MANAGER";
  const canDelete = user?.role === "ADMINISTRATOR" && Boolean(overview.data?.records);
  const select = (selected?: File) => {
    if (!selected) return;
    setFile(selected);
    preview.mutate(selected);
  };
  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/30 p-5 shadow-sm dark:border-sky-900/60 dark:bg-sky-950/15">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300">
          <Users className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">Customer Feedback</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Optional survey data for Customer Trends analysis. It is not linked
            to individual POS transactions or identified customers.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="rounded-xl border border-dashed border-sky-300 bg-white/70 p-4 dark:border-sky-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-sky-700" />
            <strong className="text-sm">Customer Feedback Rating.csv</strong>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Customer satisfaction ratings on a 1–5 scale for overall
            satisfaction, food, and service.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Required CSV fields: Date · Overall_Satisfaction ·
            Food_Satisfaction · Service_Satisfaction. Dates use DD/MM/YYYY;
            ratings must be whole numbers from 1 to 5.
          </p>
          <input
            aria-label="Customer Feedback Rating CSV"
            type="file"
            accept=".csv,text/csv"
            disabled={!canImport || preview.isPending || importer.isPending}
            onChange={(event) => select(event.target.files?.[0])}
            className="mt-4 block text-sm"
          />
        </div>
        <div className="min-w-56 rounded-xl bg-white p-4 text-sm dark:bg-slate-900">
          <p className="font-medium">Optional data source</p>
          <p className="mt-2 text-slate-500">
            Independent from the required POS import; duplicate feedback files
            are rejected.
          </p>
          {overview.data ? (
            <dl className="mt-4 space-y-2">
              <div>
                <dt className="text-xs text-slate-500">Feedback records</dt>
                <dd className="font-semibold">
                  {overview.data.records.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Data status</dt>
                <dd className="font-semibold text-emerald-700">
                  Ready for Customer Trends
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Latest import</dt>
                <dd>{date(overview.data.latestImport)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-slate-500">
              No customer feedback data imported.
            </p>
          )}
        </div>
      </div>
      {preview.data ? (
        <div className="mt-4 rounded-xl border bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{preview.data.filename}</p>
              <p className="mt-1 text-slate-500">
                {preview.data.totalRows.toLocaleString()} records ·{" "}
                {date(preview.data.dateRange.start)} –{" "}
                {date(preview.data.dateRange.end)}
              </p>
            </div>
            <button
              type="button"
              disabled={
                !canImport || preview.data.duplicate || importer.isPending
              }
              onClick={() => file && importer.mutate(file)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="size-4" />
              {importer.isPending
                ? "Importing Feedback…"
                : preview.data.duplicate
                  ? "Already Imported"
                  : "Import Feedback Data"}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Validation passed. Optional — this dataset is independent of the
            required POS import and is not matched to individual transactions.
          </p>
        </div>
      ) : null}
      {preview.isError || importer.isError ? (
        <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">
          {(preview.error ?? importer.error) instanceof Error
            ? (preview.error ?? importer.error).message
            : "Unable to validate or import Customer Feedback data."}
        </p>
      ) : null}
      {importer.isSuccess ? (
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          Customer feedback imported successfully. Status: Ready for Customer
          Trends analysis.
        </p>
      ) : null}
      {canDelete ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-sm dark:border-rose-900/70 dark:bg-rose-950/20">
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">Delete Feedback Data</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">Permanently delete all {overview.data!.records.toLocaleString()} imported customer feedback records. POS data is not affected.</p>
          </div>
          <button type="button" onClick={() => { setDeleteConfirmation(""); deletion.reset(); setDeleteOpen(true); }} className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/60">
            <Trash2 className="size-4" />Delete Feedback Data
          </button>
        </div>
      ) : null}
      {deletion.isSuccess ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">Customer feedback data was deleted successfully. Customer Satisfaction analytics will now show its empty state.</p> : null}
      {deleteOpen && overview.data ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="delete-feedback-title" className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-xl dark:border-rose-900 dark:bg-slate-950">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200"><AlertTriangle className="size-5" /></span>
              <div><h2 id="delete-feedback-title" className="font-semibold text-slate-950 dark:text-white">Delete Customer Feedback Data?</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">This permanently deletes {overview.data.records.toLocaleString()} customer feedback record{overview.data.records === 1 ? "" : "s"}. It cannot be undone.</p></div>
            </div>
            <label htmlFor="delete-feedback-confirmation" className="mt-5 block text-sm font-semibold text-slate-900 dark:text-slate-100">Type <span className="font-mono">DELETE FEEDBACK</span> to confirm</label>
            <input id="delete-feedback-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} disabled={deletion.isPending} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
            {deletion.isError ? <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">{deletion.error instanceof Error ? deletion.error.message : "Unable to delete Customer Feedback data."}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={deletion.isPending} onClick={() => setDeleteOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">Cancel</button>
              <button type="button" disabled={deleteConfirmation !== "DELETE FEEDBACK" || deletion.isPending} onClick={() => deletion.mutate(undefined, { onSuccess: () => setDeleteOpen(false) })} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50">{deletion.isPending ? "Deleting Feedback…" : "Delete"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
