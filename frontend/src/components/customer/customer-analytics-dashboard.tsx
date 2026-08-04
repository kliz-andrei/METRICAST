import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarDays, Clock3, ReceiptText, Users, UserRoundCheck, WalletCards } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSalesFilters } from '../../contexts/sales-filters-context';
import { useCustomerAnalytics } from '../../hooks/use-customer-analytics';
import type { DiningHour, GuestPeriod } from '../../services/customer-analytics.api';
import { EmptyState, ErrorState, LoadingSkeleton } from '../ui/states';
import { Button } from '../ui/button';

const colors = ['#064e3b', '#b45309', '#059669', '#d97706', '#0f766e', '#ca8a04'];
const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h3 className="mb-4 font-semibold">{title}</h3>{children}</article>;
}

function ChartState({ loading, error, empty, children }: { loading: boolean; error: boolean; empty: boolean; children: ReactNode }) {
  if (loading) return <LoadingSkeleton className="h-72" />;
  if (error) return <ErrorState message="Unable to load customer behavior data." />;
  if (empty) return <EmptyState title="No customer behavior data is available for this period." />;
  return <>{children}</>;
}

function DayTable({ title, rows }: { title: string; rows: GuestPeriod[] }) {
  return <ChartCard title={title}>{rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-slate-500"><tr><th className="pb-2 font-medium">Date</th><th className="pb-2 text-right font-medium">Guests</th><th className="pb-2 text-right font-medium">Transactions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.date} className="border-t border-slate-100 dark:border-slate-800"><td className="py-2">{row.date}</td><td className="py-2 text-right">{row.guests.toLocaleString()}</td><td className="py-2 text-right">{row.transactions.toLocaleString()}</td></tr>)}</tbody></table></div> : <EmptyState title="No dining days found." />}</ChartCard>;
}

function HourTable({ title, rows }: { title: string; rows: DiningHour[] }) {
  return <ChartCard title={title}>{rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-slate-500"><tr><th className="pb-2 font-medium">Hour</th><th className="pb-2 text-right font-medium">Guests</th><th className="pb-2 text-right font-medium">Transactions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.hour} className="border-t border-slate-100 dark:border-slate-800"><td className="py-2">{hourLabel(row.hour)}</td><td className="py-2 text-right">{row.guests.toLocaleString()}</td><td className="py-2 text-right">{row.transactions.toLocaleString()}</td></tr>)}</tbody></table></div> : <EmptyState title="No dining hours found." />}</ChartCard>;
}

function CustomerAnalyticsSkeleton() {
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><LoadingSkeleton className="h-4 w-32" /><LoadingSkeleton className="mt-3 h-8 w-24" /></div>)}</div><div className="grid gap-6 xl:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><LoadingSkeleton className="h-5 w-40" /><LoadingSkeleton className="mt-4 h-64" /></div>)}</div><div className="grid gap-6 xl:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><LoadingSkeleton className="h-5 w-40" /><LoadingSkeleton className="mt-4 h-40" /></div>)}</div></div>;
}

export function CustomerAnalyticsDashboard() {
  const { filters } = useSalesFilters();
  const query = useCustomerAnalytics(filters);

  if (query.isLoading) return <CustomerAnalyticsSkeleton />;
  if (query.isError) return <div className="space-y-3"><ErrorState message="Unable to load customer analytics." /><Button variant="outline" onClick={() => void query.refetch()}>Try again</Button></div>;
  if (!query.data || query.data.guestsPerDay.length === 0) return <EmptyState title="No guest behavior data is available for this period." />;

  const { summary } = query.data;
  const kpis = [
    ['Guests Served', summary.totalGuestsServed.toLocaleString(), Users],
    ['Avg. Guests / Transaction', summary.averageGuestsPerTransaction.toFixed(2), UserRoundCheck],
    ['Avg. Spend / Guest', money(summary.averageSpendPerGuest), WalletCards],
    ['Avg. Transactions / Day', summary.averageTransactionsPerDay.toFixed(2), ReceiptText],
    ['Peak Dining Hour', summary.peakDiningHour ?? '—', Clock3],
    ['Peak Dining Day', summary.peakDiningDay ?? '—', CalendarDays]
  ] as const;

  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{kpis.map(([label, value, Icon]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><Icon className="size-5 text-amber-700" /></div><p className="mt-3 text-2xl font-bold">{value}</p></article>)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <ChartCard title="Guests per Day"><ChartState loading={query.isLoading} error={query.isError} empty={!query.data.guestsPerDay.length}><div className="h-72"><ResponsiveContainer><LineChart data={query.data.guestsPerDay}><XAxis dataKey="date" /><YAxis /><Tooltip /><Line dataKey="guests" stroke="#047857" strokeWidth={3} /></LineChart></ResponsiveContainer></div></ChartState></ChartCard>
      <ChartCard title="Guests per Month"><ChartState loading={query.isLoading} error={query.isError} empty={!query.data.guestsPerMonth.length}><div className="h-72"><ResponsiveContainer><LineChart data={query.data.guestsPerMonth}><XAxis dataKey="month" /><YAxis /><Tooltip /><Line dataKey="guests" stroke="#b45309" strokeWidth={3} /></LineChart></ResponsiveContainer></div></ChartState></ChartCard>
      <ChartCard title="Guest Count Distribution"><ChartState loading={query.isLoading} error={query.isError} empty={!query.data.guestDistribution.length}><div className="h-72"><ResponsiveContainer><BarChart data={query.data.guestDistribution}><XAxis dataKey="guestCount" /><YAxis /><Tooltip /><Bar dataKey="transactions" fill="#047857" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartState></ChartCard>
      <ChartCard title="Dining Hour Heatmap"><ChartState loading={query.isLoading} error={query.isError} empty={!query.data.diningHourHeatmap.length}><div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">{query.data.diningHourHeatmap.map((item) => { const maximumGuests = Math.max(...query.data.diningHourHeatmap.map((hour) => hour.guests)); const opacity = maximumGuests === 0 ? 0.25 : Math.max(0.25, item.guests / maximumGuests); return <div key={item.hour} className="rounded-lg bg-emerald-50 p-2 text-center text-emerald-950 sm:p-3 dark:bg-emerald-950 dark:text-emerald-50" style={{ opacity }}><p className="text-xs font-medium">{hourLabel(item.hour)}</p><p className="mt-1 text-lg font-bold">{item.guests}</p><p className="text-xs">guests</p></div>; })}</div></ChartState></ChartCard>
      <ChartCard title="Order Type Distribution"><ChartState loading={query.isLoading} error={query.isError} empty={!query.data.orderTypeDistribution.length}><div className="h-72"><ResponsiveContainer><PieChart><Pie data={query.data.orderTypeDistribution} dataKey="guests" nameKey="orderType" outerRadius={95}>{query.data.orderTypeDistribution.map((item, index) => <Cell key={item.orderType} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></ChartState></ChartCard>
      <ChartCard title="Sales Channel Distribution"><ChartState loading={query.isLoading} error={query.isError} empty={!query.data.salesChannelDistribution.length}><div className="h-72"><ResponsiveContainer><PieChart><Pie data={query.data.salesChannelDistribution} dataKey="guests" nameKey="salesChannel" outerRadius={95}>{query.data.salesChannelDistribution.map((item, index) => <Cell key={item.salesChannel} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></ChartState></ChartCard>
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-2"><DayTable title="Highest Guest Days" rows={query.data.highestGuestDays} /><DayTable title="Lowest Guest Days" rows={query.data.lowestGuestDays} /><HourTable title="Peak Dining Hours" rows={query.data.peakDiningHours} /><HourTable title="Slow Dining Hours" rows={query.data.slowDiningHours} /></div>
  </>;
}
