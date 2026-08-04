import { Boxes, ChartNoAxesCombined, PackageCheck, WalletCards } from 'lucide-react';
import { useSalesFilters } from '../../contexts/sales-filters-context';
import { useProductAnalytics } from '../../hooks/useProductAnalytics';
import { EmptyState, ErrorState, LoadingSkeleton } from '../ui/states';

const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

export function ProductKpiCards() {
  const { filters } = useSalesFilters();
  const query = useProductAnalytics(filters);

  if (query.isLoading) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <article key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><LoadingSkeleton className="h-4 w-32" /><LoadingSkeleton className="mt-3 h-8 w-24" /></article>)}</div>;
  if (query.isError) return <ErrorState message="Unable to load product summary." />;
  if (!query.data || query.data.summary.totalProductsSold === 0) return <EmptyState title="No product sales data is available for this period." />;

  const cards = [
    ['Total Products Sold', query.data.summary.totalProductsSold.toLocaleString(), PackageCheck],
    ['Unique Products Sold', query.data.summary.uniqueProductsSold.toLocaleString(), Boxes],
    ['Total Revenue', money(query.data.summary.totalRevenue), WalletCards],
    ['Average Revenue per Product', money(query.data.summary.averageRevenuePerProduct), ChartNoAxesCombined]
  ] as const;

  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><Icon className="size-5 text-amber-700" /></div><p className="mt-3 text-2xl font-bold">{value}</p></article>)}</div>;
}
