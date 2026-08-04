import { ProductCharts } from '../components/product/product-charts';
import { ProductKpiCards } from '../components/product/product-kpi-cards';
import { ProductTables } from '../components/product/product-tables';
import { SalesFilters } from '../components/sales/sales-filters';
import { SalesFiltersProvider } from '../contexts/sales-filters-context';

export function ProductAnalyticsPage() {
  return <SalesFiltersProvider><section><div className="mb-6"><p className="text-sm font-medium text-amber-700">Under the Balete</p><h2 className="mt-1 text-3xl font-bold">Product Analytics</h2><p className="mt-2 text-slate-500">Menu performance and product revenue from your imported POS data.</p></div><SalesFilters /><ProductKpiCards /><ProductCharts /><ProductTables /></section></SalesFiltersProvider>;
}
