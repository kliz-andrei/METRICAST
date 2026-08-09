import { DayOfWeekAnalysis } from '../components/sales/day-of-week-analysis';
import { SalesCharts } from '../components/sales/sales-charts';
import { SalesFilters } from '../components/sales/sales-filters';
import { SalesKpiCards } from '../components/sales/sales-kpi-cards';
import { SalesTables } from '../components/sales/sales-tables';
import { SalesFiltersProvider } from '../contexts/sales-filters-context';

export function SalesAnalyticsPage() {
  return <SalesFiltersProvider><section><div className="mb-6"><p className="text-sm font-medium text-amber-700">Under the Balete</p><h2 className="mt-1 text-3xl font-bold">Sales Analytics</h2><p className="mt-2 text-slate-500">Live POS sales summary for the selected date range.</p></div><SalesFilters /><SalesKpiCards /><SalesCharts /><DayOfWeekAnalysis /><SalesTables /></section></SalesFiltersProvider>;
}
