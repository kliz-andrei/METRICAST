import { CheckCircle2, CircleAlert, LoaderCircle, Search, Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/auth-context';
import {
  useCostedProducts,
  useFinancialCostCoverage,
  useFinancialSettings,
  useUpdateFinancialSettings,
  useUpdateProductCost,
} from '../../hooks/use-financial-projections';
import { ErrorState, LoadingSkeleton } from '../ui/states';
import {
  filterCostingProducts,
  productRowsForCosting,
  type CostStatusFilter,
} from './product-costing-utils';

const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(value);
const percentage = (value: number) => `${value.toFixed(1)}%`;
const canManageCosts = (role?: string) => role === 'ADMINISTRATOR' || role === 'MANAGER';
const statusCopy = {
  READY: { label: 'Complete', tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200' },
  INCOMPLETE_COST_COVERAGE: { label: 'Incomplete cost coverage', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200' },
  NO_COST_CONFIGURATION: { label: 'No costs configured', tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
  NO_HISTORICAL_SALES: { label: 'No historical sales', tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
  FORECAST_UNAVAILABLE: { label: 'Forecast unavailable', tone: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200' },
  INVALID_FORECAST_SALES: { label: 'Forecast sales unavailable', tone: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200' },
} as const;

function CostInput({ id, initial, disabled }: { id: string; initial: number | null; disabled: boolean }) {
  const [value, setValue] = useState(initial === null ? '' : String(initial));
  const [feedback, setFeedback] = useState<string | null>(null);
  const update = useUpdateProductCost();
  useEffect(() => {
    setValue(initial === null ? '' : String(initial));
  }, [initial]);
  const parsed = value.trim() === '' ? null : Number(value);
  const invalid = parsed !== null && (!Number.isFinite(parsed) || parsed < 0);
  const changed = parsed !== initial;

  return <div className="min-w-44">
    <div className="flex items-center justify-end gap-2">
    <input aria-label="Unit cost" type="number" min="0" step="0.01" value={value} disabled={disabled || update.isPending} onChange={(event) => setValue(event.target.value)} className="w-24 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900" />
    {disabled ? null : <button type="button" disabled={!changed || invalid || update.isPending} onClick={() => update.mutate({ id, unitCost: parsed }, { onSuccess: () => setFeedback('Saved'), onError: () => setFeedback('Unable to save') })} className="rounded-md bg-emerald-800 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{update.isPending ? <LoaderCircle className="size-3 animate-spin" /> : 'Save'}</button>}
    </div>
    {feedback ? <p className={`mt-1 text-right text-xs ${update.isError ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{feedback}</p> : null}
  </div>;
}

export function ProductCostingManager() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [costStatus, setCostStatus] = useState<CostStatusFilter>('ALL');
  const coverage = useFinancialCostCoverage();
  const products = useCostedProducts();
  const settings = useFinancialSettings();
  const updateSettings = useUpdateFinancialSettings();
  const [overheadRate, setOverheadRate] = useState<string | null>(null);
  const canManage = canManageCosts(user?.role);
  const productRows = useMemo(() => productRowsForCosting(products.data?.products ?? []), [products.data?.products]);
  const visibleProducts = useMemo(() => {
    return filterCostingProducts(productRows, search, costStatus);
  }, [productRows, search, costStatus]);
  const coverageStatus = coverage.data ? statusCopy[coverage.data.status] : null;
  const displayedOverhead = overheadRate ?? (settings.data ? String(settings.data.overheadRate) : '');
  const parsedOverhead = Number(displayedOverhead);
  const invalidOverhead = !Number.isFinite(parsedOverhead) || parsedOverhead < 0 || parsedOverhead > 100;

  return <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
    <div className="flex min-w-0 flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div className="min-w-0">
        <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"><Settings2 className="size-4" /></span><h2 className="font-semibold text-slate-950 dark:text-white">Product Costing</h2></div>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">Configure real unit-cost reference data for financial projections. Product costs are not inferred from POS selling prices.</p>
      </div>
      {coverageStatus ? <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${coverageStatus.tone}`}>{coverageStatus.label}</span> : null}
    </div>

    {coverage.isLoading ? <LoadingSkeleton className="mt-5 h-24 rounded-xl" /> : coverage.isError ? <div className="mt-5"><ErrorState title="Unable to load cost coverage" message="Cost configuration can still be reviewed after retrying." onRetry={() => void coverage.refetch()} /></div> : coverage.data ? <div className="mt-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5"><Metric label="Sold products" value={coverage.data.costCoverage.soldProducts.toLocaleString()} /><Metric label="Configured costs" value={coverage.data.costCoverage.configuredProducts.toLocaleString()} /><Metric label="Missing costs" value={coverage.data.costCoverage.missingProducts.toLocaleString()} /><Metric label="Product coverage" value={percentage(coverage.data.costCoverage.productCoveragePercent)} /><Metric label="Item coverage" value={percentage(coverage.data.costCoverage.itemCoveragePercent)} /></div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Coverage uses distinct sold product IDs; each catalog record is shown separately.</p></div> : null}

    <div className="mt-5 min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><p className="font-medium text-slate-950 dark:text-white">Estimated Operating Overhead</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">This is a configurable estimate applied to estimated product cost for financial projection purposes.</p></div><div className="flex shrink-0 flex-wrap items-center gap-2"><input aria-label="Estimated operating overhead rate" type="number" min="0" max="100" step="0.01" disabled={!canManage || settings.isLoading || updateSettings.isPending} value={displayedOverhead} onChange={(event) => setOverheadRate(event.target.value)} className="w-24 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-right text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950" /><span className="text-sm">%</span>{canManage ? <button type="button" disabled={invalidOverhead || updateSettings.isPending || parsedOverhead === settings.data?.overheadRate} onClick={() => updateSettings.mutate(parsedOverhead, { onSuccess: () => setOverheadRate(null) })} className="rounded-md bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Save</button> : null}</div></div>
      {updateSettings.isError ? <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">Unable to save the overhead rate. Please try again.</p> : null}
      {updateSettings.isSuccess && overheadRate === null ? <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">Overhead rate saved.</p> : null}
      {!canManage ? <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Only Administrators and Managers can edit product costs or the overhead assumption.</p> : null}
    </div>

    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"><Search className="size-4 shrink-0 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, categories, or SKU…" className="w-full bg-transparent text-sm outline-none" /></div>
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"><span className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">Cost status</span><select aria-label="Filter products by cost status" value={costStatus} onChange={(event) => setCostStatus(event.target.value as CostStatusFilter)} className="min-w-32 bg-transparent text-sm font-medium outline-none"><option value="ALL">All Products</option><option value="MISSING">Missing Costs</option><option value="CONFIGURED">Configured Costs</option></select></label>
    </div>
    {products.isLoading ? <LoadingSkeleton className="mt-4 h-72 rounded-xl" /> : products.isError ? <div className="mt-4"><ErrorState title="Unable to load products for costing" message="Please retry before configuring costs." onRetry={() => void products.refetch()} /></div> : <><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Showing {visibleProducts.length.toLocaleString()} of {productRows.length.toLocaleString()} product records.</p><div className="mt-3 min-w-0 max-w-full overflow-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[640px] text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900"><tr><th className="px-3 py-3">Product</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Unit Cost</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{visibleProducts.map((product) => <tr key={product.id}><td className="px-3 py-3 font-medium text-slate-950 dark:text-white">{product.name}{product.sku ? <span className="ml-2 text-xs font-normal text-slate-500">{product.sku}</span> : null}</td><td className="px-3 py-3 text-slate-600 dark:text-slate-300">{product.category.name}</td><td className="px-3 py-3">{product.unitCost === null ? <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300"><CircleAlert className="size-3" />Missing</span> : <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-3" />Configured</span>}</td><td className="px-3 py-3"><CostInput id={product.id} initial={product.unitCost} disabled={!canManage} /></td></tr>)}{visibleProducts.length === 0 ? <tr><td colSpan={4} className="px-3 py-10 text-center text-slate-500">No products match this search.</td></tr> : null}</tbody></table></div></>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold tabular-nums text-slate-950 dark:text-white">{value}</p></div>;
}
