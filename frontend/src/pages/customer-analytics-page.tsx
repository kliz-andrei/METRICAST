import { CustomerAnalyticsDashboard } from '../components/customer/customer-analytics-dashboard';
import { SalesFilters } from '../components/sales/sales-filters';
import { SalesFiltersProvider } from '../contexts/sales-filters-context';

export function CustomerAnalyticsPage() {
  return <SalesFiltersProvider><section><div className="mb-6"><p className="text-sm font-medium text-amber-700">Under the Balete</p><h2 className="mt-1 text-3xl font-bold">Customer Analytics</h2><p className="mt-2 text-slate-500">Guest behavior and dining patterns from your POS transactions.</p></div><SalesFilters /><CustomerAnalyticsDashboard /></section></SalesFiltersProvider>;
}
