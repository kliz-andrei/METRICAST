import { Users } from 'lucide-react';
import { CustomerAnalyticsDashboard } from '../components/customer/customer-analytics-dashboard';
import { CustomerSatisfactionPanel } from '../components/customer/customer-satisfaction-panel';
import { DashboardDateRangeControl, lastCompletedCalendarMonth } from '../components/dashboard-date-range-control';
import { SalesFilters } from '../components/sales/sales-filters';
import { SalesFiltersProvider, useSalesFilters } from '../contexts/sales-filters-context';

export function CustomerAnalyticsPage() {
  return (
    <SalesFiltersProvider initialFilters={lastCompletedCalendarMonth()}>
      <CustomerAnalyticsContent />
    </SalesFiltersProvider>
  );
}

function CustomerAnalyticsContent() {
  const { filters, setFilters } = useSalesFilters();

  return (
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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <DashboardDateRangeControl
              applied={{ startDate: filters.startDate, endDate: filters.endDate }}
              onApply={({ startDate, endDate }) =>
                setFilters((current) => ({ ...current, startDate, endDate }))
              }
            />
            <SalesFilters variant="customer" hideDateFields presentation="popover" />
          </div>
        </header>
        <CustomerAnalyticsDashboard satisfaction={<CustomerSatisfactionPanel />} />
      </section>
  );
}
