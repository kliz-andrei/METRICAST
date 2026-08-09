import { CalendarDays, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Range = { startDate?: string; endDate?: string };

const iso = (date: Date) => date.toISOString().slice(0, 10);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00Z`));

const rangeLabel = (range: Range) => {
  if (!range.startDate || !range.endDate) return 'All';

  const start = formatDate(range.startDate);
  const end = formatDate(range.endDate);
  return start === end ? start : `${start} – ${end}`;
};

export function DashboardDateRangeControl({
  applied,
  onApply,
}: {
  applied: Range;
  onApply: (range: Range) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Range>(applied);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const invalid = Boolean(
    pending.startDate &&
      pending.endDate &&
      pending.endDate < pending.startDate,
  );

  const presets = useMemo(
    () => [
      {
        name: 'Today',
        getRange: () => {
          const today = new Date();
          return { startDate: iso(today), endDate: iso(today) };
        },
      },
      {
        name: 'Yesterday',
        getRange: () => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          return { startDate: iso(yesterday), endDate: iso(yesterday) };
        },
      },
      {
        name: 'Last 7 Days',
        getRange: () => {
          const end = new Date();
          const start = new Date(end);
          start.setDate(end.getDate() - 6);
          return { startDate: iso(start), endDate: iso(end) };
        },
      },
      {
        name: 'Last 30 Days',
        getRange: () => {
          const end = new Date();
          const start = new Date(end);
          start.setDate(end.getDate() - 29);
          return { startDate: iso(start), endDate: iso(end) };
        },
      },
      {
        name: 'This Month',
        getRange: () => {
          const end = new Date();
          const start = new Date(end.getFullYear(), end.getMonth(), 1);
          return { startDate: iso(start), endDate: iso(end) };
        },
      },
      {
        name: 'Last Month',
        getRange: () => {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const end = new Date(now.getFullYear(), now.getMonth(), 0);
          return { startDate: iso(start), endDate: iso(end) };
        },
      },
      {
        name: 'This Year',
        getRange: () => {
          const end = new Date();
          return { startDate: `${end.getFullYear()}-01-01`, endDate: iso(end) };
        },
      },
    ],
    [],
  );

  const appliedLabel = rangeLabel(applied);

  return (
    <div className="relative w-full sm:w-auto">
      <button
        type="button"
        aria-label="Open date range selector"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setPending(applied);
          setOpen(true);
        }}
        className="flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-emerald-900/20 bg-white px-3 text-sm font-medium text-emerald-950 shadow-sm transition hover:border-emerald-800/40 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/40 dark:focus:ring-offset-slate-950 sm:w-auto"
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarDays className="size-4 shrink-0 text-emerald-800 dark:text-amber-300" />
          <span className="truncate">Date Range: {appliedLabel}</span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Date range selector"
          className="absolute right-0 z-30 mt-2 w-[min(94vw,30rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Applied: {appliedLabel}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => setPending(preset.getRange())}
                className="rounded-md border border-slate-200 px-2 py-1.5 text-sm transition hover:border-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/40"
              >
                {preset.name}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Start date
              <input
                type="date"
                value={pending.startDate ?? ''}
                onChange={(event) =>
                  setPending((value) => ({
                    ...value,
                    startDate: event.target.value || undefined,
                  }))
                }
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
            <label className="text-sm">
              End date
              <input
                type="date"
                value={pending.endDate ?? ''}
                onChange={(event) =>
                  setPending((value) => ({
                    ...value,
                    endDate: event.target.value || undefined,
                  }))
                }
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
          </div>
          {invalid && (
            <p className="mt-2 text-sm text-red-600">
              End date must be on or after the start date.
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={invalid}
              onClick={() => {
                onApply(pending);
                setOpen(false);
              }}
              className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-emerald-950 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-slate-900"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
