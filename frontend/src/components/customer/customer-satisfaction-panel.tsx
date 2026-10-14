import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { useSalesFilters } from '../../contexts/sales-filters-context';
import { useCustomerSatisfaction, type SatisfactionTrend, type SatisfactionTrendGranularity } from '../../hooks/use-customer-satisfaction';
import { LoadingSkeleton } from '../ui/states';

type Dimension = 'overall' | 'food' | 'service';

const labels: Record<Dimension, string> = {
  overall: 'Overall Satisfaction',
  food: 'Food Satisfaction',
  service: 'Service Satisfaction',
};
const ratingColors = ['#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#047857'];

const formatDate = (value: string) => new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(value));
const periodLabel = (value: string, granularity: SatisfactionTrendGranularity) =>
  granularity === 'weekly'
    ? `Week of ${formatDate(value)}`
    : granularity === 'monthly'
      ? new Intl.DateTimeFormat('en-PH', { month: 'short', year: 'numeric' }).format(new Date(`${value}-01T00:00:00`))
      : formatDate(value);

function TrendTooltip({ active, payload, granularity }: { active?: boolean; payload?: Array<{ payload: SatisfactionTrend; value?: number }>; granularity: SatisfactionTrendGranularity }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-950">
      <p className="font-semibold">{periodLabel(point.date, granularity)}</p>
      <p className="mt-1">Average rating: <span className="font-semibold">{Number(payload?.[0]?.value ?? 0).toFixed(2)} / 5</span></p>
      <p className="text-slate-500">Responses: {point.responses.toLocaleString()}</p>
    </div>
  );
}

export function CustomerSatisfactionPanel() {
  const { filters } = useSalesFilters();
  const [dimension, setDimension] = useState<Dimension>('overall');
  const query = useCustomerSatisfaction(filters.startDate, filters.endDate);

  if (query.isLoading) return <LoadingSkeleton className="mt-6 h-[30rem] rounded-2xl" />;
  if (query.isError) return <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">Customer Satisfaction data could not be loaded. Existing POS-based Customer Analytics remain available.</section>;
  if (!query.data) {
    return (
      <section className="mt-6 rounded-2xl border bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold">No Customer Feedback Responses</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">No valid customer feedback responses are available for the selected period.</p>
        <Link to="/data" className="mt-4 inline-flex rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Go to Data Management</Link>
      </section>
    );
  }

  const data = query.data;
  const average = Number.isFinite(data.summary.averageOverallSatisfaction) ? data.summary.averageOverallSatisfaction : 0;
  const responseCount = Number.isFinite(data.summary.totalResponses) ? data.summary.totalResponses : 0;
  const satisfiedPercent = Number.isFinite(data.summary.satisfied.percent) ? data.summary.satisfied.percent : 0;
  const distribution = [1, 2, 3, 4, 5].map((rating) => {
    const item = Array.isArray(data.distribution) ? data.distribution.find((entry) => entry.rating === rating) : undefined;
    return {
      rating,
      responses: Number.isFinite(item?.responses) ? item.responses : 0,
      percent: Number.isFinite(item?.percent) ? item.percent : 0,
    };
  });
  const distributionMaximum = Math.max(...distribution.map((item) => item.responses), 1);
  const distributionDomain = Math.max(1, Math.ceil((distributionMaximum * 1.12) / 5) * 5);
  const trend = Array.isArray(data.trend) ? data.trend.filter((point) => typeof point.date === 'string' && Number.isFinite(point[dimension])) : [];

  return (
    <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header>
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Customer Satisfaction</h2>
      </header>

      <div className="mt-4 grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:sm:divide-slate-800">
        <div className="p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Average Rating</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-emerald-800 dark:text-emerald-300">{average.toFixed(2)} <span className="text-base font-medium text-slate-500">/ 5</span></p>
        </div>
        <div className="border-t border-slate-200 p-3.5 sm:border-t-0 dark:border-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total Responses</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{responseCount.toLocaleString()}</p>
        </div>
        <div className="border-t border-slate-200 p-3.5 sm:border-t-0 dark:border-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Satisfied Customers</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{satisfiedPercent.toFixed(1)}%</p>
        </div>
      </div>

      <div className="mt-5 grid items-stretch gap-5 xl:grid-cols-2">
        <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Rating Distribution (1–5)</h3>
          <div className="mt-4 h-64 text-slate-500 dark:text-slate-400">
            <ResponsiveContainer>
              <BarChart data={distribution} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.13} />
                <XAxis dataKey="rating" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} domain={[0, distributionDomain]} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value, _name, item) => [`${Number(value).toLocaleString()} responses · ${Number(item.payload.percent).toFixed(1)}%`, 'Responses']} labelFormatter={(value) => `Rating: ${value}`} />
                <Bar dataKey="responses" name="Responses" radius={[5, 5, 0, 0]} barSize={32}>
                  {distribution.map((item, index) => <Cell key={item.rating} fill={ratingColors[index]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Average Satisfaction Trend</h3>
            <select aria-label="Satisfaction trend dimension" value={dimension} onChange={(event) => setDimension(event.target.value as Dimension)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-950">
              <option value="overall">Overall</option>
              <option value="food">Food</option>
              <option value="service">Service</option>
            </select>
          </div>
          {trend.length === 0 ? (
            <p className="flex h-64 items-center justify-center text-sm text-slate-500 dark:text-slate-400">No satisfaction trend data is available for this period.</p>
          ) : (
            <div className="mt-4 h-64 text-slate-500 dark:text-slate-400">
              <ResponsiveContainer>
                <LineChart data={trend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.13} />
                  <XAxis dataKey="date" minTickGap={26} tickFormatter={(value) => data.trendGranularity === 'monthly' ? value : new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`))} tickLine={false} axisLine={false} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip content={<TrendTooltip granularity={data.trendGranularity} />} />
                  <Line type="monotone" dataKey={dimension} name={labels[dimension]} stroke="#047857" strokeWidth={3} dot={{ r: 3, fill: '#047857' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
