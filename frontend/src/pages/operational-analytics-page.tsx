import { Gauge } from "lucide-react";
import { OperationalAnalyticsDashboard } from "../components/operations/operational-analytics-dashboard";
import { SalesFilters } from "../components/sales/sales-filters";
import { SalesFiltersProvider } from "../contexts/sales-filters-context";

export function OperationalAnalyticsPage() {
  return (
    <SalesFiltersProvider>
      <section>
        <header className="mb-6">
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
                Monitor transaction flow, operating peaks, guest activity, and
                revenue efficiency.
              </p>
            </div>
          </div>
        </header>
        <SalesFilters variant="operations" />
        <OperationalAnalyticsDashboard />
      </section>
    </SalesFiltersProvider>
  );
}
