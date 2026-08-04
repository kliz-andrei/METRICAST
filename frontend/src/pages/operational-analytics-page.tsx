import { OperationalAnalyticsDashboard } from '../components/operations/operational-analytics-dashboard';
import { SalesFilters } from '../components/sales/sales-filters';
import { SalesFiltersProvider } from '../contexts/sales-filters-context';

export function OperationalAnalyticsPage() {
  return <SalesFiltersProvider><section><div className="mb-6"><p className="text-sm font-medium text-amber-700">Under the Balete</p><h2 className="mt-1 text-3xl font-bold">Operational Efficiency</h2><p className="mt-2 text-slate-500">Transaction flow, revenue timing, and payment activity from POS operations.</p></div><SalesFilters /><OperationalAnalyticsDashboard /></section></SalesFiltersProvider>;
}
