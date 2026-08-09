import { ChevronDown, Filter } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Props = {
  channels: string[];
  value: string[];
  onApply: (channels: string[]) => void;
};

export function DashboardSalesChannelFilter({ channels, value, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string[]>(value);
  const previousValue = useRef(value);

  useEffect(() => {
    if (value === previousValue.current) return;
    previousValue.current = value;
    setPending(value);
  }, [value]);

  const buttonLabel = value.length ? `Filter · ${value.length}` : 'Filter';
  const toggle = (channel: string) => setPending((current) => current.includes(channel) ? current.filter((value) => value !== channel) : [...current, channel]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Filter dashboard by sales channel"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setPending(value);
          setOpen(true);
        }}
        className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-md border border-emerald-900/20 bg-white px-2.5 text-sm font-medium text-emerald-950 shadow-sm transition hover:border-emerald-800/40 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/40"
      >
        <Filter className="size-4 shrink-0 text-emerald-800 dark:text-amber-300" />
        <span className="truncate">{buttonLabel}</span>
        {value.length > 0 && <span className="size-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />}
        <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Sales channel filter"
          className="absolute right-0 z-30 mt-2 w-[min(90vw,18rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="text-sm font-semibold">Sales Channel</p>
          <fieldset className="mt-3 space-y-2">
            <legend className="sr-only">Select a sales channel</legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!pending.length}
                onChange={() => setPending([])}
                className="size-4 accent-emerald-800"
              />
              All Channels
            </label>
            {channels.map((channel) => (
              <label key={channel} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pending.includes(channel)}
                  onChange={() => toggle(channel)}
                  className="size-4 accent-emerald-800"
                />
                {channel}
              </label>
            ))}
          </fieldset>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setPending([])}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(pending.length === channels.length ? [] : pending);
                setOpen(false);
              }}
              className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-emerald-950 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
