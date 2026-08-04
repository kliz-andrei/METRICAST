import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarDays, Clock3, ReceiptText, Users, UserRoundCheck, WalletCards } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSalesFilters } from '../../contexts/sales-filters-context';
import { useOperationalAnalytics } from '../../hooks/useOperationalAnalytics';
import type { OperationalHour } from '../../services/operational-analytics.api';
import { EmptyState, ErrorState, LoadingSkeleton } from '../ui/states';

const colors = ['#064e3b', '#b45309', '#059669', '#d97706', '#0f766e', '#ca8a04'];
const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', notation: 'compact' }).format(value);
const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h3 className="mb-4 font-semibold">{title}</h3>{children}</article>;
}

function ChartState({ empty, children }: { empty: boolean; children: ReactNode }) {
  return empty ? <EmptyState title="No operational data is available for this period." /> : <>{children}</>;
}

function HourTable({ title, rows }: { title: string; rows: OperationalHour[] }) {
  return <Card title={title}>{rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[28rem] text-sm"><thead className="text-left text-slate-500"><tr><th className="pb-2 font-medium">Hour</th><th className="pb-2 text-right font-medium">Transactions</th><th className="pb-2 text-right font-medium">Revenue</th></tr></thead><tbody>{rows.map((row) => <tr key={row.hour} className="border-t border-slate-100 dark:border-slate-800"><td className="py-2">{hourLabel(row.hour)}</td><td className="py-2 text-right">{row.transactionCount.toLocaleString()}</td><td className="py-2 text-right">{money(row.revenue)}</td></tr>)}</tbody></table></div> : <EmptyState title="No operating hours found." />}</Card>;
}

function OperationalSkeleton() {
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <LoadingSkeleton key={index} className="h-32" />)}</div><div className="grid gap-6 xl:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <LoadingSkeleton key={index} className="h-80" />)}</div><div className="grid gap-6 xl:grid-cols-2">{Array.from({ length: 3 }, (_, index) => <LoadingSkeleton key={index} className="h-64" />)}</div></div>;
}

export function OperationalAnalyticsDashboard() {
  const { filters } = useSalesFilters();
  const query = useOperationalAnalytics(filters);

  if (query.isLoading) return <OperationalSkeleton />;
  if (query.isError) return <ErrorState message="Unable to load operational analytics." />;
  if (!query.data || query.data.summary.totalTransactions === 0) return <EmptyState title="No operational data is available for this period." />;

  const { summary } = query.data;
  const kpis = [
    ['Transactions', summary.totalTransactions.toLocaleString(), ReceiptText],
    ['Avg. Guests / Transaction', summary.averageGuestsPerTransaction.toFixed(2), UserRoundCheck],
    ['Avg. Revenue / Transaction', money(summary.averageRevenuePerTransaction), WalletCards],
    ['Peak Operating Hour', summary.peakOperatingHour ?? '—', Clock3],
    ['Peak Operating Day', summary.peakOperatingDay ?? '—', CalendarDays],
    ['Avg. Daily Transactions', summary.averageDailyTransactions.toFixed(2), Users]
  ] as const;

  return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{kpis.map(([label, value, Icon]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><Icon className="size-5 text-amber-700" /></div><p className="mt-3 text-2xl font-bold">{value}</p></article>)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <Card title="Transaction Trend"><ChartState empty={!query.data.dailyTransactionDistribution.length}><div className="h-72"><ResponsiveContainer><LineChart data={query.data.dailyTransactionDistribution}><XAxis dataKey="date" /><YAxis /><Tooltip /><Line dataKey="transactionCount" stroke="#047857" strokeWidth={3} /></LineChart></ResponsiveContainer></div></ChartState></Card>
      <Card title="Hourly Revenue"><ChartState empty={!query.data.hourlyRevenue.length}><div className="h-72"><ResponsiveContainer><BarChart data={query.data.hourlyRevenue}><XAxis dataKey="hour" tickFormatter={hourLabel} /><YAxis tickFormatter={money} /><Tooltip formatter={(value) => money(Number(value))} /><Bar dataKey="revenue" fill="#b45309" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartState></Card>
      <Card title="Hourly Transactions"><ChartState empty={!query.data.hourlyTransactionDistribution.length}><div className="h-72"><ResponsiveContainer><BarChart data={query.data.hourlyTransactionDistribution}><XAxis dataKey="hour" tickFormatter={hourLabel} /><YAxis /><Tooltip /><Bar dataKey="transactionCount" fill="#047857" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartState></Card>
      <Card title="Order Type Distribution"><ChartState empty={!query.data.orderTypeDistribution.length}><div className="h-72"><ResponsiveContainer><PieChart><Pie data={query.data.orderTypeDistribution} dataKey="revenue" nameKey="orderType" outerRadius={95}>{query.data.orderTypeDistribution.map((item, index) => <Cell key={item.orderType} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(value) => money(Number(value))} /></PieChart></ResponsiveContainer></div></ChartState></Card>
      <Card title="Sales Channel Distribution"><ChartState empty={!query.data.salesChannelDistribution.length}><div className="h-72"><ResponsiveContainer><PieChart><Pie data={query.data.salesChannelDistribution} dataKey="revenue" nameKey="salesChannel" outerRadius={95}>{query.data.salesChannelDistribution.map((item, index) => <Cell key={item.salesChannel} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(value) => money(Number(value))} /></PieChart></ResponsiveContainer></div></ChartState></Card>
      <Card title="Payment Method Distribution"><ChartState empty={!query.data.paymentMethodDistribution.length}><div className="h-72"><ResponsiveContainer><BarChart data={query.data.paymentMethodDistribution}><XAxis dataKey="paymentMethod" /><YAxis tickFormatter={money} /><Tooltip formatter={(value) => money(Number(value))} /><Bar dataKey="revenue" fill="#0f766e" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartState></Card>
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-2"><HourTable title="Peak Hours" rows={query.data.busiestHours} /><HourTable title="Slow Hours" rows={query.data.slowestHours} /><Card title="Payment Summary"><div className="overflow-x-auto"><table className="w-full min-w-[28rem] text-sm"><thead className="text-left text-slate-500"><tr><th className="pb-2 font-medium">Payment Method</th><th className="pb-2 text-right font-medium">Transactions</th><th className="pb-2 text-right font-medium">Revenue</th></tr></thead><tbody>{query.data.paymentMethodDistribution.map((payment) => <tr key={payment.paymentMethod} className="border-t border-slate-100 dark:border-slate-800"><td className="py-2">{payment.paymentMethod}</td><td className="py-2 text-right">{payment.transactionCount.toLocaleString()}</td><td className="py-2 text-right">{money(payment.revenue)}</td></tr>)}</tbody><tfoot className="border-t font-semibold"><tr><td className="pt-3">{query.data.paymentMethodSummary.paymentMethods} payment methods</td><td className="pt-3 text-right">{query.data.paymentMethodSummary.totalPaymentTransactions.toLocaleString()}</td><td className="pt-3 text-right">{money(query.data.paymentMethodSummary.totalRevenue)}</td></tr></tfoot></table></div></Card></div>
  </>;
}
