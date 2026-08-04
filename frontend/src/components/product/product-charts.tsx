import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ReactNode } from 'react';
import { useSalesFilters } from '../../contexts/sales-filters-context';
import { useProductAnalytics } from '../../hooks/useProductAnalytics';
import { EmptyState, ErrorState, LoadingSkeleton } from '../ui/states';

const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', notation: 'compact' }).format(value);

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h3 className="mb-4 font-semibold">{title}</h3>{children}</article>;
}

export function ProductCharts() {
  const { filters } = useSalesFilters();
  const query = useProductAnalytics(filters);

  if (query.isLoading) return <div className="mt-6 grid gap-6 xl:grid-cols-2">{Array.from({ length: 3 }, (_, index) => <ChartCard key={index} title=""><LoadingSkeleton className="h-72" /></ChartCard>)}</div>;
  if (query.isError) return <div className="mt-6"><ErrorState message="Unable to load product analytics charts." /></div>;
  if (!query.data || query.data.summary.totalProductsSold === 0) return <div className="mt-6"><EmptyState title="No product analytics data is available for this period." /></div>;

  return <div className="mt-6 grid gap-6 xl:grid-cols-2">
    <ChartCard title="Revenue by Product"><div className="h-72"><ResponsiveContainer><BarChart data={query.data.topProducts}><XAxis dataKey="productName" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={72} /><YAxis tickFormatter={money} /><Tooltip formatter={(value) => money(Number(value))} /><Bar dataKey="revenue" fill="#047857" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartCard>
    <ChartCard title="Revenue by Category"><div className="h-72"><ResponsiveContainer><BarChart data={query.data.topCategories}><XAxis dataKey="category" tick={{ fontSize: 11 }} /><YAxis tickFormatter={money} /><Tooltip formatter={(value) => money(Number(value))} /><Bar dataKey="revenue" fill="#b45309" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartCard>
    <ChartCard title="Daily Product Revenue Trend"><div className="h-72"><ResponsiveContainer><LineChart data={query.data.productRevenueTrend}><XAxis dataKey="date" /><YAxis tickFormatter={money} /><Tooltip formatter={(value) => money(Number(value))} /><Line type="monotone" dataKey="revenue" stroke="#047857" strokeWidth={3} /></LineChart></ResponsiveContainer></div></ChartCard>
  </div>;
}
