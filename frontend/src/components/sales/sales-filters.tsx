import { useEffect, useState } from 'react';
import { useSalesFilters } from '../../contexts/sales-filters-context';
import { useReportMetadata } from '../../hooks/useReports';
import type { SalesFilters as SalesFilterValues } from '../../services/sales-analytics.api';

export function SalesFilters() {
  const { filters, setFilters } = useSalesFilters();
  const metadata = useReportMetadata();
  const [pending, setPending] = useState<SalesFilterValues>(filters);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const channelOptions = metadata.data?.salesChannels ?? [];
  const orderTypeOptions = metadata.data?.orderTypes ?? [];
  const selectedChannels = pending.salesChannels ?? (pending.salesChannel ? [pending.salesChannel] : []);
  const invalidRange = Boolean(pending.startDate && pending.endDate && pending.endDate < pending.startDate);

  useEffect(() => setPending(filters), [filters]);

  const update = (key: keyof SalesFilterValues, value: string) =>
    setPending((current) => ({ ...current, [key]: value || undefined }));

  const toggleChannel = (channel: string) => setPending((current) => {
    const currentChannels = current.salesChannels ?? (current.salesChannel ? [current.salesChannel] : []);
    const nextChannels = currentChannels.includes(channel)
      ? currentChannels.filter((value) => value !== channel)
      : [...currentChannels, channel];

    return {
      ...current,
      salesChannel: undefined,
      salesChannels: nextChannels.length ? nextChannels : undefined,
    };
  });

  const apply = () => {
    const next = {
      ...pending,
      salesChannel: undefined,
      salesChannels: selectedChannels.length ? selectedChannels : undefined,
      orderType: pending.orderType || undefined,
    };
    setFilters(next);
    setChannelsOpen(false);
  };

  const cancel = () => {
    setPending(filters);
    setChannelsOpen(false);
  };

  return (
    <section className="mb-6 rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-label="Sales filters">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Start date
          <input type="date" value={pending.startDate ?? ''} onChange={(event) => update('startDate', event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          End date
          <input type="date" value={pending.endDate ?? ''} onChange={(event) => update('endDate', event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <div className="relative">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Sales channels</span>
          <button type="button" aria-haspopup="dialog" aria-expanded={channelsOpen} onClick={() => setChannelsOpen((open) => !open)} className="mt-1 flex w-full items-center justify-between rounded-lg border bg-white p-2 text-left text-sm dark:border-slate-700 dark:bg-slate-950">
            <span>{selectedChannels.length ? `${selectedChannels.length} channel${selectedChannels.length === 1 ? '' : 's'} selected` : 'All channels'}</span>
            <span aria-hidden="true">⌄</span>
          </button>
          {channelsOpen && <div role="dialog" aria-label="Select sales channels" className="absolute z-20 mt-1 w-full min-w-56 rounded-lg border bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-2 flex gap-2 text-xs"><button type="button" onClick={() => setPending((current) => ({ ...current, salesChannel: undefined, salesChannels: channelOptions.length ? channelOptions : undefined }))} className="font-medium text-emerald-800 dark:text-emerald-300">Select all</button><button type="button" onClick={() => setPending((current) => ({ ...current, salesChannel: undefined, salesChannels: undefined }))} className="font-medium text-slate-600 dark:text-slate-300">Clear</button></div>
            <div className="max-h-48 space-y-2 overflow-y-auto">{metadata.isLoading ? <p className="text-sm text-slate-500">Loading channels…</p> : channelOptions.length ? channelOptions.map((channel) => <label key={channel} className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={selectedChannels.includes(channel)} onChange={() => toggleChannel(channel)} />{channel}</label>) : <p className="text-sm text-slate-500">No sales channels available.</p>}</div>
          </div>}
        </div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Order type
          <select value={pending.orderType ?? ''} onChange={(event) => update('orderType', event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
            <option value="">All order types</option>
            {orderTypeOptions.map((orderType) => <option key={orderType} value={orderType}>{orderType}</option>)}
          </select>
        </label>
      </div>
      {invalidRange && <p className="mt-3 text-sm text-red-700 dark:text-red-300">End date must be on or after the start date.</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => setPending({})} className="rounded-md border px-3 py-2 text-sm font-medium dark:border-slate-700">Clear</button>
        <button type="button" onClick={cancel} className="rounded-md border px-3 py-2 text-sm font-medium dark:border-slate-700">Cancel</button>
        <button type="button" disabled={invalidRange} onClick={apply} className="rounded-md bg-emerald-800 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">Apply</button>
      </div>
    </section>
  );
}
