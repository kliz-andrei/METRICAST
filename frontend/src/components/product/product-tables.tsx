import { ArrowDownUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSalesFilters } from '../../contexts/sales-filters-context';
import { useProductAnalytics } from '../../hooks/useProductAnalytics';
import type { CategoryPerformance, ProductPerformance } from '../../services/product-analytics.api';
import { EmptyState, ErrorState, LoadingSkeleton } from '../ui/states';

type TableRow = { name: string; category?: string; quantitySold: number; revenue: number };
type SortKey = 'name' | 'quantitySold' | 'revenue';
type SortDirection = 'asc' | 'desc';

const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
const productRows = (rows: ProductPerformance[]): TableRow[] => rows.map((row) => ({ name: row.productName, category: row.category, quantitySold: row.quantitySold, revenue: row.revenue }));
const categoryRows = (rows: CategoryPerformance[]): TableRow[] => rows.map((row) => ({ name: row.category, quantitySold: row.quantitySold, revenue: row.revenue }));

function SortableTable({ title, rows, showCategory }: { title: string; rows: TableRow[]; showCategory: boolean }) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const sortedRows = useMemo(() => [...rows].sort((left, right) => {
    const result = sortKey === 'name' ? left.name.localeCompare(right.name) : left[sortKey] - right[sortKey];
    return sortDirection === 'asc' ? result : -result;
  }), [rows, sortDirection, sortKey]);
  const changeSort = (key: SortKey) => {
    if (key === sortKey) setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDirection('desc'); }
  };
  const columnButton = (label: string, key: SortKey, className = '') => <button type="button" onClick={() => changeSort(key)} className={`inline-flex items-center gap-1 font-medium hover:text-emerald-800 ${className}`}>{label}<ArrowDownUp className="size-3.5" /></button>;

  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h3 className="mb-4 font-semibold">{title}</h3>{sortedRows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[36rem] text-sm"><thead className="text-left text-slate-500"><tr><th className="pb-3">{columnButton(showCategory ? 'Product' : 'Category', 'name')}</th>{showCategory && <th className="pb-3 font-medium">Category</th>}<th className="pb-3 text-right">{columnButton('Quantity Sold', 'quantitySold', 'justify-end')}</th><th className="pb-3 text-right">{columnButton('Revenue', 'revenue', 'justify-end')}</th></tr></thead><tbody>{sortedRows.map((row) => <tr key={`${row.name}-${row.category ?? ''}`} className="border-t border-slate-100 dark:border-slate-800"><td className="py-3 font-medium">{row.name}</td>{showCategory && <td className="py-3 text-slate-500">{row.category}</td>}<td className="py-3 text-right">{row.quantitySold.toLocaleString()}</td><td className="py-3 text-right">{money(row.revenue)}</td></tr>)}</tbody></table></div> : <EmptyState title="No product sales found." />}</article>;
}

export function ProductTables() {
  const { filters } = useSalesFilters();
  const query = useProductAnalytics(filters);

  if (query.isLoading) return <div className="mt-6 grid gap-6 xl:grid-cols-2">{Array.from({ length: 3 }, (_, index) => <LoadingSkeleton key={index} className="h-80" />)}</div>;
  if (query.isError) return <div className="mt-6"><ErrorState message="Unable to load product ranking tables." /></div>;
  if (!query.data || query.data.summary.totalProductsSold === 0) return <div className="mt-6"><EmptyState title="No product sales data is available for this period." /></div>;

  return <div className="mt-6 grid gap-6 xl:grid-cols-2"><SortableTable title="Top Selling Products" rows={productRows(query.data.topProducts)} showCategory /><SortableTable title="Lowest Selling Products" rows={productRows(query.data.lowestSellingProducts)} showCategory /><div className="xl:col-span-2"><SortableTable title="Category Performance" rows={categoryRows(query.data.topCategories)} showCategory={false} /></div></div>;
}
