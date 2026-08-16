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
  Lightbulb,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  Trophy,
  UserRoundCheck,
  Users,
  WalletCards,
} from 'lucide-react';
import { useSalesFilters } from '../../contexts/sales-filters-context';
import { useCustomerAnalytics } from '../../hooks/use-customer-analytics';
import type { DiningHour, GuestPeriod } from '../../services/customer-analytics.api';
import { EmptyState, ErrorState, LoadingSkeleton } from '../ui/states';

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
const formatMonth = (value: string, long = false) =>
  new Intl.DateTimeFormat('en', { month: long ? 'long' : 'short', year: long ? 'numeric' : undefined }).format(
    new Date(`${value}-01T00:00:00Z`),
  );
const formatHour = (value: number) => `${value % 12 || 12} ${value >= 12 ? 'PM' : 'AM'}`;

function partySizeAtPercentile(rows: Array<{ guestCount: number; transactions: number }>, percentile: number) {
  const sortedRows = [...rows].sort((left, right) => left.guestCount - right.guestCount);
  const totalTransactions = sortedRows.reduce((total, row) => total + row.transactions, 0);
  if (!totalTransactions) return undefined;

  const threshold = totalTransactions * percentile;
  let cumulativeTransactions = 0;
  for (const row of sortedRows) {
    cumulativeTransactions += row.transactions;
    if (cumulativeTransactions >= threshold) return row.guestCount;
  }
  return sortedRows.at(-1)?.guestCount;
}

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
  title: string;
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

function InsightCallout({ label, title, detail }: { label: string; title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5 dark:border-emerald-400/15 dark:bg-emerald-400/10">
      <div className="flex items-start gap-2.5">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-sm font-medium leading-5 text-slate-900 dark:text-slate-100">{title}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function DiningHourRows({ title, rows, lowest = false }: { title: string; rows: DiningHour[]; lowest?: boolean }) {
  const visibleRows = rows.slice(0, 3);
  const maximumGuests = Math.max(...visibleRows.map((row) => row.guests), 1);
  const accent = lowest ? 'bg-amber-400 dark:bg-amber-300' : 'bg-emerald-700 dark:bg-emerald-400';

  return (
    <AnalyticsCard
      title={title}
      subtitle={lowest ? 'Periods with the lowest recorded guest volume.' : 'Ranked by recorded guest volume.'}
    >
      <ol className="space-y-1" aria-label={title}>
        {visibleRows.map((row, index) => {
          const averagePartySize = row.transactions ? row.guests / row.transactions : 0;
          const isTop = index === 0 && !lowest;
          return (
            <li
              key={row.hour}
              tabIndex={0}
              className={`rounded-xl px-3 py-2.5 transition duration-200 hover:bg-emerald-50/70 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:hover:bg-slate-800/80 ${
                isTop ? 'bg-amber-50/80 dark:bg-amber-400/10' : ''
              }`}
            >
              <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3">
                <span
                  className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
                    isTop
                      ? 'bg-amber-400 text-emerald-950'
                      : lowest
                        ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200'
                  }`}
                  aria-label={`Rank ${index + 1}`}
                >
                  {isTop ? <Trophy className="size-3.5" aria-hidden="true" /> : index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{formatHour(row.hour)}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {formatCount(row.transactions)} transactions · {averagePartySize.toFixed(2)} guests per transaction
                  </p>
                </div>
                <p className="text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {formatCount(row.guests)} <span className="text-xs font-medium text-slate-500">guests</span>
                </p>
              </div>
              <div className="ml-10 mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${accent} transition-[width] duration-500 motion-reduce:transition-none`}
                  style={{ width: `${(row.guests / maximumGuests) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </AnalyticsCard>
  );
}

function GuestDayRanking({ title, rows, lowest = false }: { title: string; rows: GuestPeriod[]; lowest?: boolean }) {
  const maximumGuests = Math.max(...rows.map((row) => row.guests), 1);

  return (
    <AnalyticsCard
      title={title}
      subtitle={lowest ? 'Days with the lowest guest activity.' : 'Days with the highest guest activity.'}
    >
      <ol className="space-y-1" aria-label={title}>
        {rows.map((row, index) => (
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
              <p className="text-xs text-slate-500 dark:text-slate-400">{formatCount(row.transactions)} transactions</p>
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

function DistributionRows({
  title,
  subtitle,
  rows,
  nameKey,
}: {
  title: string;
  subtitle: string;
  rows: Array<{ guests: number; transactions: number; orderType?: string; salesChannel?: string }>;
  nameKey: 'orderType' | 'salesChannel';
}) {
  const totalGuests = rows.reduce((total, row) => total + row.guests, 0);
  const sortedRows = [...rows].sort((left, right) => right.guests - left.guests).slice(0, 5);
  const leadingRow = sortedRows[0];
  const leadingName = leadingRow?.[nameKey] ?? 'The leading category';
  const leadingShare = leadingRow && totalGuests ? (leadingRow.guests / totalGuests) * 100 : 0;
  const activityLabel = nameKey === 'orderType' ? 'order type' : 'guest channel';
  const hasShortRanking = sortedRows.length <= 3;

  return (
    <AnalyticsCard title={title} subtitle={subtitle} className="p-6 xl:flex xl:h-full xl:flex-col" contentClassName="xl:flex xl:flex-1 xl:flex-col">
      <div className={`space-y-3 xl:flex-1 ${hasShortRanking ? 'xl:flex xl:flex-col xl:justify-evenly xl:space-y-0' : ''}`}>
        {sortedRows.map((row, index) => {
          const name = row[nameKey] ?? 'Unspecified';
          const share = totalGuests ? (row.guests / totalGuests) * 100 : 0;
          const color = index === 0 ? 'bg-emerald-700 dark:bg-emerald-400' : index === 1 ? 'bg-amber-400' : 'bg-slate-400 dark:bg-slate-500';
          return (
            <div key={name} className="rounded-xl p-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/70">
              <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2.5 text-sm">
                <span className={`grid size-6 place-items-center rounded-full text-xs font-semibold ${index === 0 ? 'bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`} aria-label={`Rank ${index + 1}`}>
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">{name}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatCount(row.transactions)} transactions</p>
                </div>
                <p className="shrink-0 text-right tabular-nums text-slate-600 dark:text-slate-300">
                  {formatCount(row.guests)} guests <span className="text-slate-500">({share.toFixed(1)}%)</span>
                </p>
              </div>
              <div className="ml-8 mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className={`h-full rounded-full ${color} transition-[width] duration-500 motion-reduce:transition-none`} style={{ width: `${share}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {leadingRow ? (
        <div className="mt-3"><InsightCallout label="Key insight" title={`${leadingName} leads guest activity`} detail={`${leadingShare.toFixed(1)}% of recorded guests by ${activityLabel}.`} /></div>
      ) : null}
    </AnalyticsCard>
  );
}

export function CustomerAnalyticsDashboard() {
  const { filters } = useSalesFilters();
  const query = useCustomerAnalytics(filters);

  if (query.isLoading) {
    return <LoadingSkeleton className="mt-6 h-[42rem]" />;
  }

  if (query.isError) {
    return <ErrorState message="Unable to load guest behavior analytics. Please try again." />;
  }

  if (!query.data || query.data.summary.totalGuestsServed === 0) {
    return <EmptyState title="No guest activity available for the selected period." />;
  }

  const { summary, guestsPerDay, guestsPerMonth, guestDistribution, diningHourHeatmap } = query.data;
  const monthlyGuestValues = guestsPerMonth.map((row) => row.guests);
  const monthlyMinimum = Math.min(...monthlyGuestValues);
  const monthlyMaximum = Math.max(...monthlyGuestValues);
  const monthlyPadding = Math.max((monthlyMaximum - monthlyMinimum) * 0.12, monthlyMaximum * 0.04, 1);
  const monthlyDomain: [number, number] =
    monthlyMinimum <= 0
      ? [0, Math.ceil(monthlyMaximum + monthlyPadding)]
      : [Math.max(0, Math.floor(monthlyMinimum - monthlyPadding)), Math.ceil(monthlyMaximum + monthlyPadding)];
  const highestHourlyGuests = Math.max(...diningHourHeatmap.map((row) => row.guests), 1);
  const peakHour = query.data.peakDiningHours[0];
  const slowHour = query.data.slowDiningHours[0];
  const peakDate = query.data.highestGuestDays[0];
  const dominantPartySize = [...guestDistribution].sort((left, right) => right.transactions - left.transactions)[0];
  const typicalPartySizeStart = partySizeAtPercentile(guestDistribution, 0.1);
  const typicalPartySizeEnd = partySizeAtPercentile(guestDistribution, 0.9);
  const medianPartySize = partySizeAtPercentile(guestDistribution, 0.5);
  const largestRecordedParty = Math.max(...guestDistribution.map((row) => row.guestCount), 0);

  const kpis = [
    {
      label: 'Guests Served',
      value: formatCount(summary.totalGuestsServed),
      detail: 'Total recorded guests in this period',
      icon: Users,
      accent: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      label: 'Avg. Guests / Transaction',
      value: summary.averageGuestsPerTransaction.toFixed(2),
      detail: 'Typical party size',
      icon: UserRoundCheck,
      accent: 'text-sky-700 dark:text-sky-300',
    },
    {
      label: 'Avg. Spend / Guest',
      value: formatCurrency(summary.averageSpendPerGuest),
      detail: 'Net sales per recorded guest',
      icon: WalletCards,
      accent: 'text-amber-700 dark:text-amber-300',
    },
    {
      label: 'Avg. Transactions / Day',
      value: summary.averageTransactionsPerDay.toFixed(2),
      detail: 'Daily order activity',
      icon: ReceiptText,
      accent: 'text-violet-700 dark:text-violet-300',
    },
    {
      label: 'Peak Dining Hour',
      value: summary.peakDiningHour ?? '—',
      detail: 'Highest guest-volume period',
      icon: Clock3,
      accent: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      label: 'Peak Dining Day',
      value: summary.peakDiningDay ? formatDate(summary.peakDiningDay) : '—',
      detail: 'Date with the most guests',
      icon: CalendarDays,
      accent: 'text-amber-700 dark:text-amber-300',
    },
  ];

  const guestInsights = [
    {
      label: 'Peak Dining Hour',
      value: peakHour ? formatHour(peakHour.hour) : '—',
      detail: peakHour ? `${formatCount(peakHour.guests)} guests` : 'No peak hour available',
      icon: Clock3,
      color: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      label: 'Peak Dining Day',
      value: peakDate?.date ? formatDate(peakDate.date) : '—',
      detail: peakDate ? `${formatCount(peakDate.guests)} guests` : 'No peak day available',
      icon: CalendarDays,
      color: 'text-amber-700 dark:text-amber-300',
    },
    {
      label: 'Average Party Size',
      value: `${summary.averageGuestsPerTransaction.toFixed(2)} guests`,
      detail: 'Per transaction',
      icon: Users,
      color: 'text-sky-700 dark:text-sky-300',
    },
    {
      label: 'Average Spend / Guest',
      value: formatCurrency(summary.averageSpendPerGuest),
      detail: 'Net sales per recorded guest',
      icon: WalletCards,
      color: 'text-violet-700 dark:text-violet-300',
    },
  ];

  return (
    <div className="mt-6 space-y-8">
      <section aria-labelledby="guest-insights-heading" className={`${cardClass} p-5`}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 id="guest-insights-heading" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
              <Sparkles className="size-4 text-amber-600 dark:text-amber-300" aria-hidden="true" />
              Guest Insights
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Key patterns identified from the selected guest activity.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {guestInsights.map(({ label, value, detail, icon: Icon, color }) => (
            <article key={label} className="rounded-xl bg-slate-50 p-3.5 transition hover:-translate-y-0.5 hover:shadow-sm dark:bg-slate-800/70 motion-reduce:transform-none">
              <Icon className={`size-4 ${color}`} aria-hidden="true" />
              <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-1 truncate font-semibold tabular-nums text-slate-900 dark:text-slate-100" title={value}>{value}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label="Guest overview">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kpis.map(({ label, value, detail, icon: Icon, accent }) => (
            <article key={label} className={`${cardClass} relative overflow-hidden p-4`}>
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/55 to-transparent" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                  <p className="mt-2 truncate text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-slate-100" title={value}>
                    {value}
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
          <h3 id="guest-activity-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100">Guest Activity</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Daily and monthly trends in recorded guest volume.</p>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <AnalyticsCard title="Guests by Day" subtitle="Recorded guest volume across the selected period.">
            <div className="h-64 text-slate-500 dark:text-slate-400">
              <ResponsiveContainer>
                <LineChart data={guestsPerDay} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.13} />
                  <XAxis {...chartAxisProps} dataKey="date" minTickGap={38} tickFormatter={(value) => formatDate(String(value)).replace(/, \d{4}$/, '')} />
                  <YAxis {...chartAxisProps} width={45} tickFormatter={(value) => formatCount(Number(value))} />
                  <Tooltip content={<ChartTooltip labelFormatter={(value) => formatDate(String(value))} />} />
                  <Line dataKey="guests" name="Guests" stroke="#047857" strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 2 }} animationDuration={350} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsCard>
          <AnalyticsCard title="Guests by Month" subtitle="Monthly guest volume in the selected period.">
            <div className="h-64 text-slate-500 dark:text-slate-400">
              <ResponsiveContainer>
                <LineChart data={guestsPerMonth} margin={{ top: 8, right: 8, left: 14, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.13} />
                  <XAxis {...chartAxisProps} dataKey="month" tickFormatter={(value) => formatMonth(String(value))} />
                  <YAxis {...chartAxisProps} width={58} domain={monthlyDomain} tickFormatter={(value) => formatCount(Number(value))} />
                  <Tooltip content={<ChartTooltip labelFormatter={(value) => formatMonth(String(value), true)} />} />
                  <Line dataKey="guests" name="Guests" stroke="#d4a72c" strokeWidth={3} dot={{ r: 2, fill: '#d4a72c' }} activeDot={{ r: 5, strokeWidth: 2 }} animationDuration={350} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsCard>
        </div>
      </section>

      <section aria-labelledby="dining-intelligence-heading">
        <div className="mb-4">
          <h3 id="dining-intelligence-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100">Dining Intelligence</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Guest activity by operating hour, ranked for quick comparison.</p>
        </div>
        <AnalyticsCard title="Dining Hour Heatmap" subtitle="Hover an hour for guest volume, transactions, and party size.">
          <div className="grid grid-cols-3 auto-rows-fr gap-2 sm:grid-cols-5 sm:gap-3" role="list" aria-label="Dining hour guest activity heatmap">
            {diningHourHeatmap.map((row) => {
              const intensity = row.guests / highestHourlyGuests;
              const partySize = row.transactions ? row.guests / row.transactions : 0;
              return (
                <div
                  key={row.hour}
                  role="listitem"
                  tabIndex={0}
                  className="group relative flex min-h-24 flex-col justify-center rounded-xl border border-white/10 p-3 text-center text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 motion-reduce:transform-none"
                  style={{ backgroundColor: `rgba(4, 120, 87, ${0.22 + intensity * 0.72})` }}
                  aria-label={`${formatHour(row.hour)}: ${formatCount(row.guests)} guests, ${formatCount(row.transactions)} transactions, ${partySize.toFixed(2)} guests per transaction`}
                >
                  <p className="text-xs font-medium">{formatHour(row.hour)}</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{formatCount(row.guests)}</p>
                  <p className="text-[11px] text-white/80">guests</p>
                  <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-10 hidden w-48 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-left text-xs text-slate-100 shadow-xl group-hover:block group-focus:block">
                    <p className="font-semibold">{formatHour(row.hour)}</p>
                    <p className="mt-1">Guests: {formatCount(row.guests)}</p>
                    <p>Transactions: {formatCount(row.transactions)}</p>
                    <p>Guests / transaction: {partySize.toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </AnalyticsCard>
        <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
          <DiningHourRows title="Dining Hour Performance" rows={query.data.peakDiningHours} />
          <DiningHourRows title="Lowest Activity Hours" rows={query.data.slowDiningHours} lowest />
        </div>
      </section>

      <section aria-labelledby="guest-day-heading">
        <div className="mb-4">
          <h3 id="guest-day-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100">Guest Day Performance</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The highest and lowest guest-volume days in the selected period.</p>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <GuestDayRanking title="Highest Guest Days" rows={query.data.highestGuestDays} />
          <GuestDayRanking title="Lowest Guest Days" rows={query.data.lowestGuestDays} lowest />
        </div>
      </section>

      <section aria-labelledby="guest-behavior-heading">
        <div className="mb-4">
          <h3 id="guest-behavior-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100">Guest Behavior</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Party sizes, order types, and sales channels represented by actual guest activity.</p>
        </div>
        <div className="grid items-start gap-6 md:grid-cols-2 xl:items-stretch xl:grid-cols-3">
          <AnalyticsCard title="Guest Count Distribution" subtitle="Recorded party size per transaction." className="p-6 xl:flex xl:h-full xl:flex-col" contentClassName="xl:flex xl:flex-1 xl:flex-col">
            <div className="h-64 text-slate-500 dark:text-slate-400 xl:h-64">
              <ResponsiveContainer>
                <BarChart data={guestDistribution} margin={{ top: 10, right: 8, left: 8, bottom: 40 }}>
                  <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.13} />
                  <XAxis {...chartAxisProps} dataKey="guestCount" height={42} label={{ value: 'Guests', position: 'bottom', offset: 12, fill: 'currentColor', fontSize: 12 }} />
                  <YAxis {...chartAxisProps} width={48} tickFormatter={(value) => formatCount(Number(value))} />
                  <Tooltip content={<ChartTooltip labelFormatter={(value) => `${value} guests`} />} />
                  <Bar dataKey="transactions" name="Transactions" fill="#047857" radius={[5, 5, 0, 0]} animationDuration={350} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {dominantPartySize ? (
              <div className="mt-3"><InsightCallout label="Most common party size" title={`${dominantPartySize.guestCount} guests`} detail={`${formatCount(dominantPartySize.transactions)} transactions`} /></div>
            ) : null}
            {typicalPartySizeStart !== undefined && typicalPartySizeEnd !== undefined ? (
              <section className="mt-3" aria-labelledby="party-size-insights-heading">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="size-3.5 text-amber-600 dark:text-amber-300" aria-hidden="true" />
                  <h4 id="party-size-insights-heading" className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Party Size Insights</h4>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/70">
                    <UserRoundCheck className="size-3.5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                    <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">Typical range</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{typicalPartySizeStart}–{typicalPartySizeEnd}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/70">
                    <Users className="size-3.5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                    <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">Median party</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{medianPartySize ?? '—'} guests</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/70">
                    <Sparkles className="size-3.5 text-amber-600 dark:text-amber-300" aria-hidden="true" />
                    <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">Largest party</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{largestRecordedParty} guests</p>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">The middle 80% of recorded transactions serve between {typicalPartySizeStart} and {typicalPartySizeEnd} guests.</p>
              </section>
            ) : null}
          </AnalyticsCard>
          <DistributionRows title="Order Type Distribution" subtitle="Guest activity by order type." rows={query.data.orderTypeDistribution} nameKey="orderType" />
          <DistributionRows title="Sales Channel Distribution" subtitle="Guest activity by sales channel." rows={query.data.salesChannelDistribution} nameKey="salesChannel" />
        </div>
      </section>

    </div>
  );
}
