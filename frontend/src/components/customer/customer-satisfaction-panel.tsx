import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { useSalesFilters } from '../../contexts/sales-filters-context';
import { useCustomerSatisfaction, type SatisfactionCategory, type SatisfactionDimension, type SatisfactionTrend, type SatisfactionTrendGranularity } from '../../hooks/use-customer-satisfaction';
import { LoadingSkeleton } from '../ui/states';

const categoryMeta: Record<SatisfactionDimension, { label: string; color: string }> = {
  overall: { label: 'Overall Experience', color: '#047857' },
  food: { label: 'Food Satisfaction', color: '#0284c7' },
  service: { label: 'Service Satisfaction', color: '#d97706' },
};
const dimensions = Object.keys(categoryMeta) as SatisfactionDimension[];
const formatDate = (value: string) => new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`));
const periodLabel = (value: string, granularity: SatisfactionTrendGranularity) =>
  granularity === 'weekly'
    ? `Week of ${formatDate(value)}`
    : granularity === 'monthly'
      ? new Intl.DateTimeFormat('en-PH', { month: 'short', year: 'numeric' }).format(new Date(`${value}-01T00:00:00`))
      : formatDate(value);

function TrendTooltip({ active, payload, granularity }: { active?: boolean; payload?: Array<{ dataKey?: string; value?: number; color?: string; payload?: SatisfactionTrend }>; granularity: SatisfactionTrendGranularity }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-950">
    <p className="font-semibold">{periodLabel(point.date, granularity)}</p>
    {payload?.map((item) => <p key={item.dataKey} style={{ color: item.color }}>{categoryMeta[item.dataKey as SatisfactionDimension]?.label}: <span className="font-semibold">{Number(item.value).toFixed(2)} / 5</span></p>)}
    <p className="mt-1 text-slate-500">Responses: {point.responses.toLocaleString()}</p>
  </div>;
}

function DistributionTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: Record<string, unknown> }> }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-950">
    <p className="font-semibold">Rating: {String(point.rating)}</p>
    {dimensions.map((key) => <p key={key}>{categoryMeta[key].label}: <span className="font-semibold">{Number(point[key] ?? 0).toLocaleString()} responses ({Number(point[`${key}Percent`] ?? 0).toFixed(1)}%)</span></p>)}
  </div>;
}

function categoryFor(categories: SatisfactionCategory[], key: SatisfactionDimension): SatisfactionCategory {
  return categories.find((category) => category.key === key) ?? { key, average: null, validResponses: 0, distribution: [] };
}

export function CustomerSatisfactionPanel() {
  const { filters } = useSalesFilters();
  const query = useCustomerSatisfaction(filters.startDate, filters.endDate);
  if (query.isLoading) return <LoadingSkeleton className="mt-6 h-[42rem] rounded-2xl" />;
  if (query.isError) return <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">Customer Satisfaction data could not be loaded. Existing POS-based Customer Analytics remain available.</section>;
  if (!query.data) return <section className="mt-6 rounded-2xl border bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900"><h2 className="font-semibold">No Customer Feedback Responses</h2><p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">No valid customer feedback responses are available for the selected period.</p><Link to="/data" className="mt-4 inline-flex rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Go to Data Management</Link></section>;

  const data = query.data;
  const categories = dimensions.map((key) => categoryFor(data.categories, key));
  const comparison = categories.filter((category) => category.average !== null).map((category) => ({ name: categoryMeta[category.key].label, rating: category.average, responses: category.validResponses, fill: categoryMeta[category.key].color }));
  const distribution = [1, 2, 3, 4, 5].map((rating) => Object.fromEntries([
    ['rating', rating],
    ...categories.flatMap((category) => {
      const item = category.distribution.find((entry) => entry.rating === rating);
      return [[category.key, item?.responses ?? 0], [`${category.key}Percent`, item?.percent ?? 0]];
    }),
  ]));
  const distributionMaximum = Math.max(1, ...distribution.flatMap((row) => dimensions.map((key) => Number(row[key]) || 0)));
  const trend = Array.isArray(data.trend) ? data.trend.filter((point) => typeof point.date === 'string' && dimensions.some((key) => Number.isFinite(point[key]))) : [];
  const highest = data.highestRatedCategory ? categoryFor(data.categories, data.highestRatedCategory) : null;
  const lowest = data.lowestRatedCategory ? categoryFor(data.categories, data.lowestRatedCategory) : null;

  return <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <header><h2 className="font-semibold text-slate-900 dark:text-slate-100">Customer Satisfaction</h2><p className="mt-1 text-sm text-slate-500">Survey ratings are shown independently for overall experience, food, and service.</p></header>

    <div className="mt-4 grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
      {categories.map((category) => <div key={category.key} className="border-b border-slate-200 p-3.5 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0 dark:border-slate-800"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{categoryMeta[category.key].label}</p><p className="mt-1.5 text-2xl font-bold tabular-nums" style={{ color: categoryMeta[category.key].color }}>{category.average === null ? 'N/A' : `${category.average.toFixed(2)} `}<span className="text-base font-medium text-slate-500">{category.average === null ? '' : '/ 5'}</span></p><p className="mt-1 text-xs text-slate-500">{category.validResponses.toLocaleString()} valid responses</p></div>)}
      <div className="p-3.5"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total Feedback Responses</p><p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{data.summary.totalResponses.toLocaleString()}</p><p className="mt-1 text-xs text-slate-500">Distinct survey responses</p></div>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Satisfaction by Category</h3><div className="mt-4 h-64 text-slate-500 dark:text-slate-400"><ResponsiveContainer><BarChart data={comparison} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.13} /><XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} /><YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickLine={false} axisLine={false} /><Tooltip formatter={(value, _name, item) => [`${Number(value).toFixed(2)} / 5 · ${Number(item.payload.responses).toLocaleString()} valid responses`, 'Average rating']} /><Bar dataKey="rating" name="Average rating" radius={[5, 5, 0, 0]}>{comparison.map((item) => <Cell key={item.name} fill={item.fill} />)}</Bar></BarChart></ResponsiveContainer></div></article>
      <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Rating Distribution by Category</h3><div className="mt-4 h-64 text-slate-500 dark:text-slate-400"><ResponsiveContainer><BarChart data={distribution} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.13} /><XAxis dataKey="rating" tickLine={false} axisLine={false} label={{ value: 'Rating', position: 'insideBottom', offset: -3 }} /><YAxis allowDecimals={false} domain={[0, Math.max(1, Math.ceil(distributionMaximum * 1.15))]} tickLine={false} axisLine={false} /><Tooltip content={<DistributionTooltip />} /><Legend />{dimensions.map((key) => <Bar key={key} dataKey={key} name={categoryMeta[key].label} fill={categoryMeta[key].color} radius={[3, 3, 0, 0]} />)}</BarChart></ResponsiveContainer></div></article>
    </div>

    <article className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800"><h3 className="font-semibold text-slate-900 dark:text-slate-100">Satisfaction Trends</h3>{trend.length === 0 ? <p className="flex h-64 items-center justify-center text-sm text-slate-500 dark:text-slate-400">No satisfaction trend data is available for this period.</p> : <div className="mt-4 h-64 text-slate-500 dark:text-slate-400"><ResponsiveContainer><LineChart data={trend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.13} /><XAxis dataKey="date" minTickGap={26} tickFormatter={(value) => data.trendGranularity === 'monthly' ? value : new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`))} tickLine={false} axisLine={false} /><YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip content={<TrendTooltip granularity={data.trendGranularity} />} /><Legend />{dimensions.map((key) => <Line key={key} type="monotone" dataKey={key} name={categoryMeta[key].label} stroke={categoryMeta[key].color} strokeWidth={2.5} dot={{ r: 2.5, fill: categoryMeta[key].color }} activeDot={{ r: 4 }} />)}</LineChart></ResponsiveContainer></div>}</article>

    {highest && lowest ? <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/70 dark:text-slate-300"><span className="font-medium" style={{ color: categoryMeta[highest.key].color }}>{categoryMeta[highest.key].label}</span> was the highest-rated available category at <strong>{highest.average?.toFixed(2)} / 5</strong>, while <span className="font-medium" style={{ color: categoryMeta[lowest.key].color }}>{categoryMeta[lowest.key].label}</span> was lowest at <strong>{lowest.average?.toFixed(2)} / 5</strong>.</p> : <p className="mt-4 text-sm text-slate-500">Not enough category-level feedback is available for an insight.</p>}
  </section>;
}
