import {
  CalendarDays,
  ChevronDown,
  ShoppingBag,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSalesFilters } from "../../contexts/sales-filters-context";
import { useReportMetadata } from "../../hooks/useReports";
import type { SalesFilters as SalesFilterValues } from "../../services/sales-analytics.api";

interface SalesFiltersProps {
  variant?: "default" | "customer" | "product" | "operations";
  hideDateFields?: boolean;
  presentation?: "card" | "popover";
}

export function SalesFilters({ variant = "default", hideDateFields = false, presentation = "card" }: SalesFiltersProps) {
  const { filters, setFilters } = useSalesFilters();
  const metadata = useReportMetadata();
  const [pending, setPending] = useState<SalesFilterValues>(filters);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const channelOptions = metadata.data?.salesChannels ?? [];
  const orderTypeOptions = metadata.data?.orderTypes ?? [];
  const selectedChannels =
    pending.salesChannels ??
    (pending.salesChannel ? [pending.salesChannel] : []);
  const invalidRange = Boolean(
    pending.startDate && pending.endDate && pending.endDate < pending.startDate,
  );

  useEffect(() => setPending(filters), [filters]);

  useEffect(() => {
    if (!filterMenuOpen) return;

    const closeWhenOutside = (event: PointerEvent) => {
      if (!filterMenuRef.current?.contains(event.target as Node)) setFilterMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [filterMenuOpen]);

  const update = (key: keyof SalesFilterValues, value: string) =>
    setPending((current) => ({ ...current, [key]: value || undefined }));

  const toggleChannel = (channel: string) =>
    setPending((current) => {
      const currentChannels =
        current.salesChannels ??
        (current.salesChannel ? [current.salesChannel] : []);
      const nextChannels = currentChannels.includes(channel)
        ? currentChannels.filter((value) => value !== channel)
        : [...currentChannels, channel];

      return {
        ...current,
        salesChannel: undefined,
        salesChannels: nextChannels.length ? nextChannels : undefined,
      };
    });

  const clearPending = () => {
    setPending(
      hideDateFields
        ? { startDate: filters.startDate, endDate: filters.endDate }
        : {},
    );
    setChannelsOpen(false);
  };

  const apply = () => {
    setFilters({
      ...pending,
      salesChannel: undefined,
      salesChannels: selectedChannels.length ? selectedChannels : undefined,
      orderType: pending.orderType || undefined,
    });
    setChannelsOpen(false);
    setFilterMenuOpen(false);
  };

  const cancel = () => {
    setPending(filters);
    setChannelsOpen(false);
  };

  if (variant === "default") {
    return (
      <section
        className="mb-6 rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        aria-label="Sales filters"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Start date
            <input
              type="date"
              value={pending.startDate ?? ""}
              onChange={(event) => update("startDate", event.target.value)}
              className="mt-1 w-full rounded-lg border bg-white p-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            End date
            <input
              type="date"
              value={pending.endDate ?? ""}
              onChange={(event) => update("endDate", event.target.value)}
              className="mt-1 w-full rounded-lg border bg-white p-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <ChannelPicker
            channelsOpen={channelsOpen}
            setChannelsOpen={setChannelsOpen}
            channelOptions={channelOptions}
            selectedChannels={selectedChannels}
            metadataLoading={metadata.isLoading}
            toggleChannel={toggleChannel}
            selectAll={() =>
              setPending((current) => ({
                ...current,
                salesChannel: undefined,
                salesChannels: channelOptions.length
                  ? channelOptions
                  : undefined,
              }))
            }
            clearChannels={() =>
              setPending((current) => ({
                ...current,
                salesChannel: undefined,
                salesChannels: undefined,
              }))
            }
          />
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Order type
            <select
              value={pending.orderType ?? ""}
              onChange={(event) => update("orderType", event.target.value)}
              className="mt-1 w-full rounded-lg border bg-white p-2 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">All order types</option>
              {orderTypeOptions.map((orderType) => (
                <option key={orderType} value={orderType}>
                  {orderType}
                </option>
              ))}
            </select>
          </label>
        </div>
        {invalidRange && (
          <p className="mt-3 text-sm text-red-700 dark:text-red-300">
            End date must be on or after the start date.
          </p>
        )}
        <FilterActions
          clear={clearPending}
          cancel={cancel}
          apply={apply}
          invalidRange={invalidRange}
        />
      </section>
    );
  }

  const fieldClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 hover:bg-slate-50 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-900 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20";
  const fieldLabelClass =
    "mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400";

  const compactCustomerFilters = hideDateFields;
  const customerPopover = compactCustomerFilters && presentation === "popover";
  const hasChannelFilter =
    selectedChannels.length > 0 &&
    (!channelOptions.length || selectedChannels.length < channelOptions.length);
  const activeFilterCount = (hasChannelFilter ? 1 : 0) + (pending.orderType ? 1 : 0);
  const compactFieldClass =
    "h-11 w-full rounded-lg border border-emerald-900/20 bg-white px-3 text-sm font-medium text-emerald-950 shadow-sm transition hover:border-emerald-800/40 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/40 dark:focus:ring-offset-slate-950";

  const customerFilterControls = (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <span className={fieldLabelClass}>
            <Store className="size-3.5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
            Sales channel
          </span>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={channelsOpen}
            onClick={() => setChannelsOpen((open) => !open)}
            className={`${compactFieldClass} flex items-center justify-between text-left`}
          >
            <span className="flex min-w-0 items-center gap-2 truncate">
              <Store className="size-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
              {selectedChannels.length
                ? `${selectedChannels.length} channel${selectedChannels.length === 1 ? "" : "s"} selected`
                : "All channels"}
            </span>
            <ChevronDown className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
          </button>
          <ChannelPickerMenu
            channelsOpen={channelsOpen}
            channelOptions={channelOptions}
            selectedChannels={selectedChannels}
            metadataLoading={metadata.isLoading}
            toggleChannel={toggleChannel}
            selectAll={() => setPending((current) => ({ ...current, salesChannel: undefined, salesChannels: channelOptions.length ? channelOptions : undefined }))}
            clearChannels={() => setPending((current) => ({ ...current, salesChannel: undefined, salesChannels: undefined }))}
          />
        </div>
        <div className="block">
          <span className={fieldLabelClass}>
            <ShoppingBag className="size-3.5 text-amber-600 dark:text-amber-300" aria-hidden="true" />
            Order type
          </span>
          <div className="relative">
            <ShoppingBag className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-amber-600 dark:text-amber-300" aria-hidden="true" />
            <select value={pending.orderType ?? ""} onChange={(event) => update("orderType", event.target.value)} className={`${compactFieldClass} appearance-none pl-10 pr-9`}>
              <option value="">All order types</option>
              {orderTypeOptions.map((orderType) => <option key={orderType} value={orderType}>{orderType}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          </div>
        </div>
      </div>
      <FilterActions clear={clearPending} cancel={cancel} apply={apply} invalidRange={invalidRange} showCancel={false} compact />
    </>
  );

  if (customerPopover) {
    return (
      <div ref={filterMenuRef} className="relative">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={filterMenuOpen}
          aria-label="Open analytics filters"
          onClick={() => setFilterMenuOpen((open) => !open)}
          className="flex h-11 items-center gap-2 rounded-lg border border-emerald-900/20 bg-white px-3 text-sm font-medium text-emerald-950 shadow-sm transition hover:border-emerald-800/40 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/40 dark:focus:ring-offset-slate-950"
        >
          <SlidersHorizontal className="size-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
          Filters
          {activeFilterCount > 0 ? <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200">{activeFilterCount}</span> : null}
          <ChevronDown className={`size-4 text-slate-400 transition-transform ${filterMenuOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {filterMenuOpen ? (
          <section role="dialog" aria-label="Analytics filters" className="absolute right-0 z-30 mt-2 w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xl dark:border-slate-700/80 dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              <SlidersHorizontal className="size-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
              Filters
              {activeFilterCount > 0 ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] normal-case tracking-normal text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200">{activeFilterCount} active</span> : null}
            </div>
            {customerFilterControls}
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900 sm:p-5"
      aria-label={`${variant === "product" ? "Product" : variant === "operations" ? "Operational" : "Customer"} analytics filters`}
    >
      {compactCustomerFilters ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              <SlidersHorizontal className="size-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
              Filters
              {activeFilterCount > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200">{activeFilterCount} active</span>}
            </h3>
          </div>
        </div>
      ) : <div>
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
            <SlidersHorizontal
              className="size-4 text-emerald-700 dark:text-emerald-300"
              aria-hidden="true"
            />
            Filter &amp; Analysis Controls
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {variant === "product"
              ? "Refine the product performance shown throughout Product Analytics."
              : variant === "operations"
                ? "Refine transaction flow, operating peaks, and revenue efficiency."
                : "Refine the guest data shown throughout Customer Analytics."}
          </p>
        </div>
      </div>}

      {compactCustomerFilters ? customerFilterControls : <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {!hideDateFields && <DateField
          id="customer-start-date"
          label="Start date"
          value={pending.startDate ?? ""}
          onChange={(value) => update("startDate", value)}
          fieldClass={fieldClass}
          fieldLabelClass={fieldLabelClass}
        />}
        {!hideDateFields && <DateField
          id="customer-end-date"
          label="End date"
          value={pending.endDate ?? ""}
          onChange={(value) => update("endDate", value)}
          fieldClass={fieldClass}
          fieldLabelClass={fieldLabelClass}
        />}
        <div className="relative">
          <span className={fieldLabelClass}>
            <Store
              className="size-3.5 text-emerald-700 dark:text-emerald-300"
              aria-hidden="true"
            />
            Sales channel
          </span>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={channelsOpen}
            onClick={() => setChannelsOpen((open) => !open)}
            className={`${compactCustomerFilters ? compactFieldClass : fieldClass} flex items-center justify-between text-left`}
          >
            <span className="flex min-w-0 items-center gap-2 truncate">
              {compactCustomerFilters && <Store className="size-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />}
              {selectedChannels.length
                ? `${selectedChannels.length} channel${selectedChannels.length === 1 ? "" : "s"} selected`
                : "All channels"}
            </span>
            <ChevronDown
              className="size-4 shrink-0 text-slate-400"
              aria-hidden="true"
            />
          </button>
          <ChannelPickerMenu
            channelsOpen={channelsOpen}
            channelOptions={channelOptions}
            selectedChannels={selectedChannels}
            metadataLoading={metadata.isLoading}
            toggleChannel={toggleChannel}
            selectAll={() =>
              setPending((current) => ({
                ...current,
                salesChannel: undefined,
                salesChannels: channelOptions.length
                  ? channelOptions
                  : undefined,
              }))
            }
            clearChannels={() =>
              setPending((current) => ({
                ...current,
                salesChannel: undefined,
                salesChannels: undefined,
              }))
            }
          />
        </div>
        <div className="block">
          <span className={fieldLabelClass}>
            <ShoppingBag
              className="size-3.5 text-amber-600 dark:text-amber-300"
              aria-hidden="true"
            />
            Order type
          </span>
          <div className="relative">
            {compactCustomerFilters && <ShoppingBag className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-amber-600 dark:text-amber-300" aria-hidden="true" />}
            <select
              value={pending.orderType ?? ""}
              onChange={(event) => update("orderType", event.target.value)}
              className={`${compactCustomerFilters ? compactFieldClass : fieldClass} appearance-none pr-9 ${compactCustomerFilters ? 'pl-10' : ''}`}
            >
              <option value="">All order types</option>
              {orderTypeOptions.map((orderType) => (
                <option key={orderType} value={orderType}>
                  {orderType}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>}
      {!hideDateFields && invalidRange && (
        <p className="mt-3 text-sm text-red-700 dark:text-red-300">
          End date must be on or after the start date.
        </p>
      )}
      {!compactCustomerFilters && <FilterActions
        clear={clearPending}
        cancel={cancel}
        apply={apply}
        invalidRange={invalidRange}
        polished={!compactCustomerFilters}
        showCancel={!compactCustomerFilters}
        compact={compactCustomerFilters}
      />}
    </section>
  );
}

function DateField({
  id,
  label,
  value,
  onChange,
  fieldClass,
  fieldLabelClass,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  fieldClass: string;
  fieldLabelClass: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerOpenedByPointer = useRef(false);
  const openDatePicker = () => {
    const input = inputRef.current;
    if (!input) return false;
    input.focus();

    if (typeof input.showPicker !== "function") return false;
    try {
      input.showPicker();
      return true;
    } catch {
      return false;
    }
  };
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      event.button !== 0 ||
      typeof inputRef.current?.showPicker !== "function"
    )
      return;
    event.preventDefault();
    pickerOpenedByPointer.current = openDatePicker();
  };
  const handleClick = () => {
    if (pickerOpenedByPointer.current) {
      pickerOpenedByPointer.current = false;
      return;
    }
    openDatePicker();
  };

  return (
    <div className="block">
      <label htmlFor={id} className={fieldLabelClass}>
        <CalendarDays
          className="size-3.5 text-amber-600 dark:text-amber-300"
          aria-hidden="true"
        />
        {label}
      </label>
      <div
        className="relative"
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      >
        <CalendarDays
          className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={id}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${fieldClass} relative z-0 pl-9`}
        />
      </div>
    </div>
  );
}

function ChannelPicker({
  channelsOpen,
  setChannelsOpen,
  channelOptions,
  selectedChannels,
  metadataLoading,
  toggleChannel,
  selectAll,
  clearChannels,
}: {
  channelsOpen: boolean;
  setChannelsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  channelOptions: string[];
  selectedChannels: string[];
  metadataLoading: boolean;
  toggleChannel: (channel: string) => void;
  selectAll: () => void;
  clearChannels: () => void;
}) {
  return (
    <div className="relative">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Sales channels
      </span>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={channelsOpen}
        onClick={() => setChannelsOpen((open) => !open)}
        className="mt-1 flex w-full items-center justify-between rounded-lg border bg-white p-2 text-left text-sm dark:border-slate-700 dark:bg-slate-950"
      >
        <span>
          {selectedChannels.length
            ? `${selectedChannels.length} channel${selectedChannels.length === 1 ? "" : "s"} selected`
            : "All channels"}
        </span>
        <ChevronDown className="size-4" aria-hidden="true" />
      </button>
      <ChannelPickerMenu
        channelsOpen={channelsOpen}
        channelOptions={channelOptions}
        selectedChannels={selectedChannels}
        metadataLoading={metadataLoading}
        toggleChannel={toggleChannel}
        selectAll={selectAll}
        clearChannels={clearChannels}
      />
    </div>
  );
}

function ChannelPickerMenu({
  channelsOpen,
  channelOptions,
  selectedChannels,
  metadataLoading,
  toggleChannel,
  selectAll,
  clearChannels,
}: {
  channelsOpen: boolean;
  channelOptions: string[];
  selectedChannels: string[];
  metadataLoading: boolean;
  toggleChannel: (channel: string) => void;
  selectAll: () => void;
  clearChannels: () => void;
}) {
  if (!channelsOpen) return null;
  return (
    <div
      role="dialog"
      aria-label="Select sales channels"
      className="absolute z-20 mt-1 w-full min-w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="mb-2 flex gap-2 text-xs">
        <button
          type="button"
          onClick={selectAll}
          className="font-medium text-emerald-800 dark:text-emerald-300"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={clearChannels}
          className="font-medium text-slate-600 dark:text-slate-300"
        >
          Clear
        </button>
      </div>
      <div className="max-h-48 space-y-2 overflow-y-auto">
        {metadataLoading ? (
          <p className="text-sm text-slate-500">Loading channels…</p>
        ) : channelOptions.length ? (
          channelOptions.map((channel) => (
            <label
              key={channel}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selectedChannels.includes(channel)}
                onChange={() => toggleChannel(channel)}
              />
              {channel}
            </label>
          ))
        ) : (
          <p className="text-sm text-slate-500">No sales channels available.</p>
        )}
      </div>
    </div>
  );
}

function FilterActions({
  clear,
  cancel,
  apply,
  invalidRange,
  polished = false,
  showCancel = true,
  compact = false,
}: {
  clear: () => void;
  cancel: () => void;
  apply: () => void;
  invalidRange: boolean;
  polished?: boolean;
  showCancel?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`${polished ? "mt-5 border-t border-slate-100 pt-4 dark:border-slate-800" : compact ? "mt-3" : "mt-4"} flex flex-wrap justify-end gap-2`}
    >
      <button
        type="button"
        onClick={clear}
        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/25 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        Clear
      </button>
      {showCancel && <button
        type="button"
        onClick={cancel}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700/25 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Cancel
      </button>}
      <button
        type="button"
        disabled={invalidRange}
        onClick={apply}
        className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600 dark:focus:ring-emerald-400 dark:focus:ring-offset-slate-900"
      >
        Apply
      </button>
    </div>
  );
}
