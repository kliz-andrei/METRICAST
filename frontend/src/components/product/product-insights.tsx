import { Layers3, Lightbulb, TrendingDown, Trophy } from 'lucide-react';
import { useSalesFilters } from '../../contexts/sales-filters-context';
import { useProductAnalytics } from '../../hooks/useProductAnalytics';
import { EmptyState, ErrorState, LoadingSkeleton } from '../ui/states';

const formatCurrency = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export function ProductInsights() {
  const { filters } = useSalesFilters();
  const query = useProductAnalytics(filters);

  if (query.isLoading) return <LoadingSkeleton className="h-44" />;
  if (query.isError) return <ErrorState message="Unable to load product insights." />;
  if (!query.data || query.data.summary.totalProductsSold === 0) return <EmptyState title="No product insights are available for the selected filters." />;

  const topProduct = query.data.topProducts[0];
  const topCategory = query.data.topCategories[0];
  const lowestProduct = query.data.lowestSellingProducts[0];
  const insights = [
    topProduct && { label: 'Top revenue product', value: topProduct.productName, detail: `${formatCurrency(topProduct.revenue)} revenue · ${topProduct.quantitySold.toLocaleString()} sold`, icon: Trophy, color: 'text-amber-700 dark:text-amber-300' },
    topCategory && { label: 'Highest revenue category', value: topCategory.category, detail: `${formatCurrency(topCategory.revenue)} revenue · ${topCategory.quantitySold.toLocaleString()} sold`, icon: Layers3, color: 'text-emerald-700 dark:text-emerald-300' },
    lowestProduct && { label: 'Lowest quantity product', value: lowestProduct.productName, detail: `${lowestProduct.quantitySold.toLocaleString()} sold · ${formatCurrency(lowestProduct.revenue)} revenue`, icon: TrendingDown, color: 'text-violet-700 dark:text-violet-300' },
  ].filter(Boolean) as Array<{ label: string; value: string; detail: string; icon: typeof Trophy; color: string }>;

  return <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900" aria-labelledby="product-insights-heading"><div><h3 id="product-insights-heading" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100"><Lightbulb className="size-4 text-amber-600 dark:text-amber-300" aria-hidden="true" />Product Insights</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Key product-performance signals from the selected POS activity.</p></div><div className="mt-4 grid gap-3 md:grid-cols-3">{insights.map(({ label, value, detail, icon: Icon, color }) => <article key={label} className="rounded-xl bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:shadow-sm dark:bg-slate-800/70 motion-reduce:transform-none"><Icon className={`size-4 ${color}`} aria-hidden="true" /><p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 truncate font-semibold text-slate-900 dark:text-slate-100" title={value}>{value}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{detail}</p></article>)}</div></section>;
}
