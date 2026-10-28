import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CalendarDays,
  Clock3,
  ReceiptText,
  Sparkles,
  Trophy,
  UserRoundCheck,
  Users,
  WalletCards,
} from 'lucide-react';
import { useSalesFilters } from '../../contexts/sales-filters-context';
import { useCustomerAnalytics } from '../../hooks/use-customer-analytics';
import { useCustomerSatisfaction } from '../../hooks/use-customer-satisfaction';
import { aggregateDatedSeries, getTimeGranularity, getYAxisDomain, formatTimePeriod } from '../../lib/chart-presentation';
import { percentChange, previousPeriod } from '../../lib/date-range';
import type { GuestPeriod, TransactionPeriod } from '../../services/customer-analytics.api';
import { ChartSkeleton, EmptyState, ErrorState, LoadingSkeleton } from '../ui/states';

const formatCount = (value: number) => value.toLocaleString('en-PH');
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00Z`));
const formatHour = (value: number) => `${value % 12 || 12} ${value >= 12 ? 'PM' : 'AM'}`;
const compactDateRange = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return 'All available dates';
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return `${startDate} – ${endDate}`;
  if (start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth()) {
    const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(start);
    return `${month} ${String(start.getUTCDate()).padStart(2, '0')}–${String(end.getUTCDate()).padStart(2, '0')}, ${start.getUTCFullYear()}`;
  }
  const formatShortDate = (date: Date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date);
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
};

const cardClass =
  'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900';
const chartAxisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fill: 'currentColor', fontSize: 12 },
} as const;

function AnalyticsCard({
  title,
  subtitle,
  children,
  className = '',
  contentClassName = '',
}: {
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <article className={`${cardClass} ${className}`}>
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      <div className={`mt-4 ${contentClassName}`}>{children}</div>
    </article>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string; payload?: Record<string, unknown> }>;
  label?: string | number;
  labelFormatter?: (value: string | number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-950">
      <p className="font-semibold text-slate-900 dark:text-slate-100">
        {labelFormatter ? labelFormatter(label ?? '') : label}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} className="mt-1 text-slate-600 dark:text-slate-300">
          <span className="font-medium" style={{ color: entry.color }}>
            {entry.name}:
          </span>{' '}
          <span className="tabular-nums">{formatCount(Number(entry.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

type DailyInterpretationPoint = { date?: string; value: number };

function DailyChartInterpretation({
  heading,
  points,
  metricLabel,
  unit,
}: {
  heading: string;
  points: DailyInterpretationPoint[];
  metricLabel: string;
  unit: string;
}) {
  const validPoints = points
    .filter((point): point is Required<DailyInterpretationPoint> => Boolean(point.date) && Number.isFinite(point.value))
    .sort((left, right) => left.date.localeCompare(right.date));

  let highest: Required<DailyInterpretationPoint> | undefined;
  let lowest: Required<DailyInterpretationPoint> | undefined;
  if (validPoints.length >= 2) {
    highest = validPoints[0];
    lowest = validPoints[0];
    for (const point of validPoints.slice(1)) {
      if (point.value > highest.value) highest = point;
      if (point.value < lowest.value) lowest = point;
    }
  }

  return (
    <div className="mt-3 border-t border-slate-200/80 pt-3 dark:border-slate-800">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{heading}</h4>
      {!highest || !lowest ? (
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Not enough data to interpret this period.</p>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <section className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 dark:border-emerald-400/15 dark:bg-emerald-400/10">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Highest {metricLabel}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{formatDate(highest.date)}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatCount(highest.value)} <span className="text-sm font-medium">{unit}</span></p>
            </section>
            <section className="rounded-lg border border-amber-100 bg-amber-50/70 p-3 dark:border-amber-400/15 dark:bg-amber-400/10">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">Lowest {metricLabel}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{formatDate(lowest.date)}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatCount(lowest.value)} <span className="text-sm font-medium">{unit}</span></p>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function GuestDayRanking({ title, rows, lowest = false }: { title: string; rows: GuestPeriod[]; lowest?: boolean }) {
  const visibleRows = [...rows]
    .sort((left, right) => lowest ? left.guests - right.guests : right.guests - left.guests)
    .slice(0, 5);
  const maximumGuests = Math.max(...visibleRows.map((row) => row.guests), 1);

  return (
    <AnalyticsCard
      title={title}
      subtitle={lowest ? 'Days with the lowest guest activity.' : 'Days with the highest guest activity.'}
    >
      <ol className="space-y-1" aria-label={title}>
        {visibleRows.map((row, index) => (
          <li
            key={row.date}
            tabIndex={0}
            className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 transition duration-200 hover:bg-emerald-50/70 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:hover:bg-slate-800/80 ${
              index === 0 && !lowest ? 'bg-amber-50/80 dark:bg-amber-400/10' : ''
            }`}
          >
            <span
              className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
                index === 0 && !lowest
                  ? 'bg-amber-400 text-emerald-950'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {index === 0 && !lowest ? <Trophy className="size-3.5" aria-hidden="true" /> : index + 1}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                <CalendarDays className="size-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                {row.date ? formatDate(row.date) : '—'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{formatCount(row.transactions)} transactions with recorded guests</p>
              <div className="mt-1.5 h-1.5 max-w-40 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${lowest ? 'bg-amber-400 dark:bg-amber-300' : 'bg-emerald-700 dark:bg-emerald-400'}`}
                  style={{ width: `${(row.guests / maximumGuests) * 100}%` }}
                />
              </div>
            </div>
            <p className="text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {formatCount(row.guests)} <span className="text-xs font-medium text-slate-500">guests</span>
            </p>
          </li>
        ))}
      </ol>
    </AnalyticsCard>
  );
}

export function CustomerAnalyticsDashboard({ satisfaction }: { satisfaction?: React.ReactNode }) {
  const { filters } = useSalesFilters();
  const query = useCustomerAnalytics(filters);
  const priorRange = previousPeriod(filters);
  const previousQuery = useCustomerAnalytics(
    priorRange ? { ...filters, ...priorRange } : {},
    Boolean(priorRange),
  );
  const satisfactionQuery = useCustomerSatisfaction(filters.startDate, filters.endDate);

  if (query.isLoading) {
    return <div className="mt-6 grid gap-6 xl:grid-cols-2"><ChartSkeleton height="h-80" /><ChartSkeleton height="h-80" /><ChartSkeleton height="h-80" /><ChartSkeleton height="h-80" /></div>;
  }

  if (query.isError) {
    return <ErrorState message="Unable to load guest behavior analytics. Please try again." />;
  }

  if (!query.data?.summary) {
    return <ErrorState message="Customer analytics returned incomplete data. Please try again." />;
  }

  if (query.data.summary.totalTransactions === 0) {
    return <EmptyState title="No transaction activity available for the selected period." />;
  }

  const { summary } = query.data;
  const guestsPerDay = Array.isArray(query.data.guestsPerDay) ? query.data.guestsPerDay : [];
  const transactionsPerDay = Array.isArray(query.data.transactionsPerDay) ? query.data.transactionsPerDay : [];
  const guestDistribution = Array.isArray(query.data.guestDistribution) ? query.data.guestDistribution : [];
  const diningHourHeatmap = Array.isArray(query.data.diningHourHeatmap) ? query.data.diningHourHeatmap : [];
  const peakDiningHours = Array.isArray(query.data.peakDiningHours) ? query.data.peakDiningHours : [];
  const slowDiningHours = Array.isArray(query.data.slowDiningHours) ? query.data.slowDiningHours : [];
  const highestGuestDays = Array.isArray(query.data.highestGuestDays) ? query.data.highestGuestDays : [];
  const lowestGuestDays = Array.isArray(query.data.lowestGuestDays) ? query.data.lowestGuestDays : [];
  const recordedDiningHours = [...diningHourHeatmap]
    .filter((row) => Number.isInteger(row.hour) && row.hour >= 0 && row.hour <= 23 && Number.isFinite(row.guests) && row.guests > 0 && Number.isFinite(row.transactions) && row.transactions >= 0)
    .sort((left, right) => left.hour - right.hour);
  const guestTrendGranularity = getTimeGranularity(guestsPerDay);
  const displayedGuestTrend = aggregateDatedSeries(guestsPerDay, ['guests', 'transactions'], guestTrendGranularity);
  const transactionTrendGranularity = getTimeGranularity(transactionsPerDay);
  const displayedTransactionTrend = aggregateDatedSeries(transactionsPerDay, ['transactions'], transactionTrendGranularity);
  const guestYAxisDomain = getYAxisDomain(displayedGuestTrend.map((row) => row.guests));
  const selectedDateRange = compactDateRange(filters.startDate, filters.endDate);
  const highestHourlyGuests = recordedDiningHours.length === 0 ? 0 : Math.max(...recordedDiningHours.map((row) => row.guests));
  const lowestHourlyGuests = recordedDiningHours.length === 0 ? 0 : Math.min(...recordedDiningHours.map((row) => row.guests));
  const hourlyGuestAverage = recordedDiningHours.length === 0
    ? 0
    : recordedDiningHours.reduce((total, row) => total + row.guests, 0) / recordedDiningHours.length;
  const peakHourlyRows = recordedDiningHours.filter((row) => row.guests === highestHourlyGuests);
  const offPeakHourlyRows = recordedDiningHours.filter((row) => row.guests === lowestHourlyGuests);
  const peakHourlyLabel = peakHourlyRows.map((row) => formatHour(row.hour)).join(', ');
  const offPeakHourlyLabel = offPeakHourlyRows.map((row) => formatHour(row.hour)).join(', ');
  const hourlyGuestDifference = highestHourlyGuests - lowestHourlyGuests;
  const previousSummary = previousQuery.isPlaceholderData || previousQuery.isError
    ? undefined
    : previousQuery.data?.summary;
  const comparison = (current: number, previous: number | undefined) =>
    previous === undefined ? undefined : percentChange(current, previous);
  const peakHour = peakDiningHours.find((row) => Number.isFinite(row.hour) && Number.isFinite(row.guests) && row.guests > 0);
  const slowHour = slowDiningHours.find((row) => Number.isFinite(row.hour) && Number.isFinite(row.guests) && row.guests > 0);
  const peakDate = highestGuestDays.find((row) => typeof row.date === 'string' && Number.isFinite(row.guests));
  const busiestTransactionDay = [...transactionsPerDay]
    .filter((row): row is TransactionPeriod & { date: string } => typeof row.date === 'string' && Number.isFinite(row.transactions) && row.transactions > 0)
    .sort((left, right) => right.transactions - left.transactions)[0];
  const dominantPartySize = [...guestDistribution]
    .filter((row) => Number.isFinite(row.guestCount) && row.guestCount > 0 && Number.isFinite(row.transactions) && row.transactions > 0)
    .sort((left, right) => right.transactions - left.transactions)[0];

  const kpis = [
    {
      label: 'Guest Count',
      value: formatCount(summary.totalGuestsServed),
      detail: 'Total recorded guests in this period',
      comparison: comparison(summary.totalGuestsServed, previousSummary?.totalGuestsServed),
      icon: Users,
      accent: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      label: 'Number of Transactions',
      value: formatCount(summary.totalTransactions),
      detail: 'Recorded orders in this period',
      comparison: comparison(summary.totalTransactions, previousSummary?.totalTransactions),
      icon: ReceiptText,
      accent: 'text-violet-700 dark:text-violet-300',
    },
    {
      label: 'Avg. Guests / Transaction',
      value: summary.averageGuestsPerTransaction.toFixed(2),
      detail: 'Typical party size',
      comparison: comparison(summary.averageGuestsPerTransaction, previousSummary?.averageGuestsPerTransaction),
      icon: UserRoundCheck,
      accent: 'text-sky-700 dark:text-sky-300',
    },
    {
      label: 'Avg. Spend / Guest',
      value: formatCurrency(summary.averageSpendPerGuest),
      detail: 'Net sales per recorded guest',
      comparison: comparison(summary.averageSpendPerGuest, previousSummary?.averageSpendPerGuest),
      icon: WalletCards,
      accent: 'text-amber-700 dark:text-amber-300',
    },
  ];

  const guestChange = comparison(summary.totalGuestsServed, previousSummary?.totalGuestsServed);
  const guestActivityPattern = guestChange === undefined
    ? 'No comparable previous-period guest activity is available.'
    : guestChange === 0
      ? 'Recorded guest activity remained stable versus the previous period.'
      : `Recorded guest activity ${guestChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(guestChange).toFixed(1)}% versus the previous period.`;
  const dominantPartySizeShare = dominantPartySize && summary.eligibleTransactions > 0
    ? (dominantPartySize.transactions / summary.eligibleTransactions) * 100
    : undefined;
  const satisfactionData = satisfactionQuery.data;
  const overallSatisfaction = satisfactionData?.categories.find((category) => category.key === 'overall');
  const ratingDistribution = Array.isArray(overallSatisfaction?.distribution)
    ? overallSatisfaction.distribution.filter((item) => Number.isFinite(item.rating) && item.rating >= 1 && item.rating <= 5 && Number.isFinite(item.responses) && item.responses > 0)
    : [];
  const mostCommonRating = [...ratingDistribution].sort((left, right) => right.responses - left.responses)[0];
  const hasSatisfactionResponses = Boolean(
    satisfactionData?.summary
      && Number.isFinite(satisfactionData.summary.totalResponses)
      && satisfactionData.summary.totalResponses > 0
      && Boolean(overallSatisfaction && Number.isFinite(overallSatisfaction.average)),
  );
  const businessInsights = [
    {
      title: 'Guest Activity Pattern',
      text: guestActivityPattern,
      icon: Users,
    },
    {
      title: 'Busiest Day by Transactions',
      text: busiestTransactionDay
        ? `${formatDate(busiestTransactionDay.date)} recorded ${formatCount(busiestTransactionDay.transactions)} transactions.`
        : 'No transaction day is available.',
      icon: ReceiptText,
    },
    {
      title: 'Party Size Distribution',
      text: dominantPartySize && dominantPartySizeShare !== undefined
        ? `${dominantPartySize.guestCount} guests was the most common party size (${formatCount(dominantPartySize.transactions)} recorded parties; ${dominantPartySizeShare.toFixed(1)}%).`
        : 'No party-size distribution is available.',
      icon: UserRoundCheck,
    },
    {
      title: 'Peak Guest Day',
      text: peakDate?.date
        ? `${formatDate(peakDate.date)} · ${formatCount(peakDate.guests)} recorded guests.`
        : 'No recorded guest day is available.',
      icon: CalendarDays,
    },
    {
      title: 'Peak & Off-Peak Hours',
      text: peakHour && slowHour
        ? `Busiest: ${formatHour(peakHour.hour)} (${formatCount(peakHour.guests)} guests). Quietest: ${formatHour(slowHour.hour)} (${formatCount(slowHour.guests)} guests).`
        : peakHour
          ? `Busiest: ${formatHour(peakHour.hour)} (${formatCount(peakHour.guests)} guests).`
          : 'No recorded operating-hour guest activity is available.',
      icon: Clock3,
    },
    {
      title: 'Customer Satisfaction',
      text: satisfactionQuery.isLoading
        ? 'Loading survey responses…'
        : satisfactionQuery.isError
          ? 'Customer satisfaction survey data could not be loaded.'
          : !hasSatisfactionResponses
            ? 'No survey responses available.'
            : `Average overall rating was ${overallSatisfaction!.average!.toFixed(2)} / 5 from ${formatCount(overallSatisfaction!.validResponses)} valid responses.${mostCommonRating ? ` Rating ${mostCommonRating.rating} was the most common response.` : ''}`,
      icon: Sparkles,
    },
  ];

  return (
    <div className="mt-6 space-y-8">
      <section aria-labelledby="guest-insights-heading" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900">
        <div>
          <h3 id="guest-insights-heading" className="font-semibold">Business Insights</h3>
          <p className="mt-0.5 text-sm text-slate-500">Key findings from guest activity and customer feedback.</p>
        </div>
        <div className="mt-3 grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {businessInsights.map(({ title, text, icon: Icon }) => (
            <article key={title} className="rounded-xl bg-slate-50 p-3.5 transition duration-200 motion-reduce:transition-none dark:bg-slate-800/70">
              <div className="flex items-center gap-1.5 text-emerald-800 dark:text-amber-300">
                <Icon className="size-4" aria-hidden="true" />
                <p className="font-medium">{title}</p>
              </div>
              <p className="mt-1.5 text-sm leading-5 text-slate-600 dark:text-slate-300">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Customer Trends</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Guest activity, transaction patterns, operating-hour behavior, and customer satisfaction.</p>
      </div>

      <section aria-label="Guest overview">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map(({ label, value, detail, comparison, icon: Icon, accent }) => (
            <article key={label} className={`${cardClass} relative overflow-hidden p-4`}>
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/55 to-transparent" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                  <p className="mt-2 truncate text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-slate-100" title={value}>
                    {value}
                  </p>
                  <p
                    className={`mt-1 text-xs font-medium ${
                      comparison === undefined
                        ? 'text-slate-500 dark:text-slate-400'
                        : comparison >= 0
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {comparison === undefined
                      ? 'No previous-period comparison'
                      : `${comparison >= 0 ? '↑' : '↓'} ${Math.abs(comparison).toFixed(1)}% vs previous period`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
                </div>
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  <Icon className={`size-4 ${accent}`} aria-hidden="true" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="guest-activity-heading">
        <div className="mb-4">
          <h3 id="guest-activity-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100">Guest Count Trends</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Daily guest activity and transaction volume across the selected period.</p>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <AnalyticsCard title={<span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"><span>Guest Count Trends</span><span className="text-sm font-normal text-slate-500 dark:text-slate-400">{selectedDateRange}</span></span>}>
            <div className="h-64 text-slate-500 dark:text-slate-400">
              <ResponsiveContainer>
                <LineChart data={displayedGuestTrend} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.13} />
                  <XAxis {...chartAxisProps} dataKey="date" minTickGap={38} tickFormatter={(value) => formatTimePeriod(String(value), guestTrendGranularity)} />
                  <YAxis {...chartAxisProps} width={45} domain={guestYAxisDomain} tickFormatter={(value) => formatCount(Number(value))} />
                  <Tooltip content={<ChartTooltip labelFormatter={(value) => formatTimePeriod(String(value), guestTrendGranularity, true)} />} />
                  <Line dataKey="guests" name="Guests" stroke="#047857" strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 2 }} animationDuration={350} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <DailyChartInterpretation heading="Guest Count Interpretation" points={guestsPerDay.map((row) => ({ date: row.date, value: row.guests }))} metricLabel="Guest Count" unit="guests" />
          </AnalyticsCard>
          <AnalyticsCard title={<span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"><span>Daily Transactions</span><span className="text-sm font-normal text-slate-500 dark:text-slate-400">{selectedDateRange}</span></span>}>
            <div className="h-64 text-slate-500 dark:text-slate-400">
              <ResponsiveContainer>
                <BarChart data={displayedTransactionTrend} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.13} />
                  <XAxis {...chartAxisProps} dataKey="date" minTickGap={38} tickFormatter={(value) => formatTimePeriod(String(value), transactionTrendGranularity)} />
                  <YAxis {...chartAxisProps} width={45} tickFormatter={(value) => formatCount(Number(value))} />
                  <Tooltip content={<ChartTooltip labelFormatter={(value) => formatTimePeriod(String(value), transactionTrendGranularity, true)} />} />
                  <Bar dataKey="transactions" name="Transactions" fill="#d4a72c" radius={[5, 5, 0, 0]} animationDuration={350} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <DailyChartInterpretation heading="Transaction Interpretation" points={transactionsPerDay.map((row) => ({ date: row.date, value: row.transactions }))} metricLabel="Transaction Count" unit="transactions" />
          </AnalyticsCard>
        </div>
      </section>

      <section aria-labelledby="dining-intelligence-heading">
        <div className="mb-4">
          <h3 id="dining-intelligence-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100">Peak &amp; Off-Peak Hours</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Hourly guest activity highlights the busiest and quietest operating periods.</p>
        </div>
        <AnalyticsCard title={<span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"><span>Hourly Guest Activity</span><span className="w-fit rounded-md bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">{selectedDateRange}</span></span>}>
          {recordedDiningHours.length === 0 ? (
            <div className="border-t border-slate-200/80 pt-3 dark:border-slate-800">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Peak &amp; Off-Peak Hours Interpretation</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">No hourly guest activity is available for this period.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 auto-rows-fr gap-3 sm:grid-cols-3 lg:grid-cols-5" role="list" aria-label="Hourly guest activity heatmap">
                {recordedDiningHours.map((row) => {
                  const partySize = row.transactions ? row.guests / row.transactions : 0;
                  const isPeak = row.guests === highestHourlyGuests;
                  const isQuietest = row.guests === lowestHourlyGuests;
                  const intensity = highestHourlyGuests === lowestHourlyGuests
                    ? 0.5
                    : (row.guests - lowestHourlyGuests) / (highestHourlyGuests - lowestHourlyGuests);
                  const colorClass = isPeak
                    ? 'border-emerald-800 bg-emerald-800 text-white dark:border-emerald-500 dark:bg-emerald-500'
                    : intensity > 0.66 || row.guests > hourlyGuestAverage
                      ? 'border-emerald-700 bg-emerald-700 text-white dark:border-emerald-600 dark:bg-emerald-600'
                      : intensity >= 0.34
                        ? 'border-emerald-500 bg-emerald-500 text-white dark:border-emerald-500 dark:bg-emerald-500'
                        : isQuietest
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100'
                          : 'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-400/15 dark:text-emerald-100';
                  const mutedTextClass = intensity >= 0.34 ? 'text-white/80' : 'text-emerald-800/75 dark:text-emerald-100/75';
                  return (
                    <div
                      key={row.hour}
                      role="listitem"
                      tabIndex={0}
                      className={`group relative flex min-h-28 flex-col items-center justify-center rounded-xl border p-3 text-center shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 motion-reduce:transform-none ${colorClass}`}
                      aria-label={`${formatHour(row.hour)}: ${formatCount(row.guests)} guests, ${formatCount(row.transactions)} transactions with recorded guests, ${partySize.toFixed(2)} guests per transaction`}
                    >
                      <div className="absolute left-2 top-2 flex gap-1">
                        {isPeak ? <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">PEAK</span> : null}
                        {isQuietest ? <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${intensity >= 0.34 ? 'bg-white/20 text-white' : 'bg-emerald-900/10 text-emerald-900 dark:text-emerald-100'}`}>QUIETEST</span> : null}
                      </div>
                      <p className="text-sm font-semibold">{formatHour(row.hour)}</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums">{formatCount(row.guests)}</p>
                      <p className={`text-xs ${mutedTextClass}`}>guests</p>
                      <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-10 hidden w-52 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 shadow-xl group-hover:block group-focus:block dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                        <p className="font-semibold">{formatHour(row.hour)}</p>
                        <p className="mt-1">Guests: {formatCount(row.guests)}</p>
                        <p>Transactions with recorded guests: {formatCount(row.transactions)}</p>
                        <p>Guests / transaction: {partySize.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-end gap-2 text-xs text-slate-500 dark:text-slate-400" aria-label="Guest activity color legend">
                <span>Lower activity</span>
                <span className="h-2.5 w-16 rounded-full bg-gradient-to-r from-emerald-100 via-emerald-500 to-emerald-800 dark:from-emerald-400/20 dark:via-emerald-500 dark:to-emerald-400" aria-hidden="true" />
                <span>Higher activity</span>
              </div>
              <div className="mt-3 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Peak &amp; Off-Peak Hours Interpretation</h4>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">
                  Peak guest activity occurred at <span className="font-medium text-emerald-800 dark:text-emerald-300">{peakHourlyLabel}{peakHourlyRows.length > 1 ? ' (tie)' : ''}</span>, with <span className="font-medium tabular-nums text-slate-800 dark:text-slate-200">{formatCount(highestHourlyGuests)} guests</span>, while the lowest activity was recorded at <span className="font-medium text-emerald-700 dark:text-emerald-300">{offPeakHourlyLabel}{offPeakHourlyRows.length > 1 ? ' (tie)' : ''}</span>, with <span className="font-medium tabular-nums text-slate-800 dark:text-slate-200">{formatCount(lowestHourlyGuests)} guests</span> — a difference of <span className="font-medium tabular-nums text-slate-800 dark:text-slate-200">{formatCount(hourlyGuestDifference)} guests</span>.
                </p>
              </div>
            </>
          )}
        </AnalyticsCard>
      </section>

      {satisfaction}

      <section aria-labelledby="guest-day-heading">
        <div className="mb-4">
          <h3 id="guest-day-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100">Guest Day Performance</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The highest and lowest guest-volume days in the selected period.</p>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <GuestDayRanking title="Highest Guest Days" rows={highestGuestDays} />
          <GuestDayRanking title="Lowest Guest Days" rows={lowestGuestDays} lowest />
        </div>
      </section>

    </div>
  );
}
