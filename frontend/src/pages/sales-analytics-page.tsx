import { SalesKpiCards } from '../components/sales/sales-kpi-cards';
import { SalesCharts } from '../components/sales/sales-charts';
import { SalesTables } from '../components/sales/sales-tables';
import { SalesFiltersProvider } from '../contexts/sales-filters-context';
import { SalesFilters } from '../components/sales/sales-filters';
export function SalesAnalyticsPage(){return <SalesFiltersProvider><section><div className="mb-6"><p className="text-sm font-medium text-amber-700">Under the Balete</p><h2 className="mt-1 text-3xl font-bold">Sales Analytics</h2><p className="mt-2 text-slate-500">Live POS sales summary for the selected date range.</p></div><SalesFilters/><SalesKpiCards/><SalesCharts/><SalesTables/></section></SalesFiltersProvider>}
