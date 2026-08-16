import { Boxes, ChartNoAxesCombined, PackageCheck, WalletCards } from 'lucide-react';
import { useSalesFilters } from '../../contexts/sales-filters-context';
import { useProductAnalytics } from '../../hooks/useProductAnalytics';
import { EmptyState, ErrorState, LoadingSkeleton } from '../ui/states';

const formatCurrency = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export function ProductKpiCards() {
  const { filters } = useSalesFilters();
  const query = useProductAnalytics(filters);

  if (query.isLoading) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <article key={index} className="h-32 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><LoadingSkeleton className="h-4 w-32" /><LoadingSkeleton className="mt-4 h-7 w-24" /></article>)}</div>;
  if (query.isError) return <ErrorState message="Unable to load product performance KPIs." />;
  if (!query.data || query.data.summary.totalProductsSold === 0) return <EmptyState title="No product activity found for the selected filters." />;

  const cards = [
    { label: 'Total Products Sold', value: query.data.summary.totalProductsSold.toLocaleString(), detail: 'Items sold across filtered transactions', icon: PackageCheck, accent: 'text-emerald-700 dark:text-emerald-300' },
    { label: 'Unique Products Sold', value: query.data.summary.uniqueProductsSold.toLocaleString(), detail: 'Distinct menu products with activity', icon: Boxes, accent: 'text-sky-700 dark:text-sky-300' },
    { label: 'Total Product Revenue', value: formatCurrency(query.data.summary.totalRevenue), detail: 'Revenue from recorded product sales', icon: WalletCards, accent: 'text-amber-700 dark:text-amber-300' },
    { label: 'Average Revenue per Product', value: formatCurrency(query.data.summary.averageRevenuePerProduct), detail: 'Average across active products', icon: ChartNoAxesCombined, accent: 'text-violet-700 dark:text-violet-300' },
  ];

  return <section aria-label="Product KPI overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, detail, icon: Icon, accent }) => <article key={label} className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900"><div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/55 to-transparent" /><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p><p className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-slate-100">{value}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p></div><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800"><Icon className={`size-4 ${accent}`} aria-hidden="true" /></span></div></article>)}</section>;
}
