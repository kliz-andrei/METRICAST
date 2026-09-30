import { Gauge } from "lucide-react";
import { OperationalAnalyticsDashboard } from "../components/operations/operational-analytics-dashboard";
import { DashboardDateRangeControl } from "../components/dashboard-date-range-control";
import { SalesFilters } from "../components/sales/sales-filters";
import { SalesFiltersProvider, useSalesFilters } from "../contexts/sales-filters-context";

export function OperationalAnalyticsPage() {
  return (
    <SalesFiltersProvider>
      <OperationalAnalyticsContent />
    </SalesFiltersProvider>
  );
}

function OperationalAnalyticsContent() {
  const { filters, setFilters } = useSalesFilters();

  return (
    <section>
      <header className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-none text-amber-700 dark:text-amber-300">
            Under the Balete
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300">
              <Gauge className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-3xl font-bold leading-tight text-slate-900 dark:text-slate-100">
                Operational Efficiency
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Operational patterns derived from POS transaction, order, and
                product data.
              </p>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <DashboardDateRangeControl
            applied={{ startDate: filters.startDate, endDate: filters.endDate }}
            onApply={({ startDate, endDate }) => setFilters((current) => ({ ...current, startDate, endDate }))}
          />
          <SalesFilters variant="operations" hideDateFields presentation="popover" />
        </div>
      </header>
      <OperationalAnalyticsDashboard />
    </section>
  );
}
