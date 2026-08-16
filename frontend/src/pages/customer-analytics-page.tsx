import { Users } from 'lucide-react';
import { CustomerAnalyticsDashboard } from '../components/customer/customer-analytics-dashboard';
import { SalesFilters } from '../components/sales/sales-filters';
import { SalesFiltersProvider } from '../contexts/sales-filters-context';

export function CustomerAnalyticsPage() {
  return (
    <SalesFiltersProvider>
      <section>
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium leading-none text-amber-700 dark:text-amber-300">Under the Balete</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300">
                <Users className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-3xl font-bold leading-tight text-slate-900 dark:text-slate-100">Customer Analytics</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Understand guest behavior, dining patterns, and customer activity across the selected period.
                </p>
              </div>
            </div>
          </div>
        </header>
        <SalesFilters variant="customer" />
        <CustomerAnalyticsDashboard />
      </section>
    </SalesFiltersProvider>
  );
}
