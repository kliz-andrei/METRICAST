import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/ui/states';
import { useDemandProducts, useGenerateNetSalesForecast, useGenerateProductDemand } from '../hooks/useForecasting';
import type { ForecastTarget, NetSalesForecast } from '../services/forecasting.api';

const pesos = (value: number) => `${value < 0 ? '-' : ''}₱${Math.round(Math.abs(value)).toLocaleString('en-PH')}`;
const currencyTick = (value: number) => `₱${Math.round(value / 1000)}K`;
const monthTicks = ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01'];
const month = (date: string) => new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(`${date}T00:00:00Z`));
const targets = [
  { value: 'net_sales', label: 'Net Sales', enabled: true },
  { value: 'transaction_volume', label: 'Transaction Volume', enabled: true },
  { value: 'guest_count', label: 'Guest Count', enabled: true },
  { value: 'product_demand', label: 'Product Demand', enabled: true },
  { value: 'category_sales', label: 'Category Sales', enabled: false }
] as const;

const Card = ({ title, value }: { title: string; value: string }) => <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold">{value}</p></article>;

function ForecastTooltip({ active, payload, label, currency }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; currency: boolean }) {
  if (!active || !payload?.length || !label) return null;
  return <div className="rounded-lg border bg-white p-3 text-sm shadow-lg dark:bg-slate-900"><p className="font-semibold">{new Date(`${label}T00:00:00Z`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</p>{payload.filter((item) => item.value !== undefined && item.value !== null).map((item) => <p key={item.name} style={{ color: item.color }}>{item.name}: {currency ? pesos(item.value) : Math.round(item.value).toLocaleString()}</p>)}</div>;
}

function Results({ data }: { data: NetSalesForecast }) {
  const historical = data.historical ?? [];
  const validation = data.validation ?? [];
  const forecast = data.forecast ?? [];
  const chart = [...historical.map((row) => ({ date: row.date, 'Training Actual': row.value })), ...validation.map((row) => ({ date: row.date, 'Validation Actual': row.actual, 'Validation Predicted': row.predicted })), ...forecast.map((row) => ({ date: row.date, 'Future Forecast': row.predicted }))];
  const futureChart = forecast.map((row) => ({ date: row.date, Forecast: row.predicted, 'Lower Bound': row.lowerBound, 'Upper Bound': row.upperBound }));
  const allValues = [...historical.map((row) => row.value), ...validation.flatMap((row) => [row.actual, row.predicted]), ...forecast.flatMap((row) => [row.predicted, row.lowerBound, row.upperBound])];
  const values = allValues.length ? allValues : [0];
  const padding = (Math.max(...values) - Math.min(...values)) * 0.1 || 1;
  const currency = data.target === 'net_sales';
  const unit = data.target === 'transaction_volume' ? 'transactions' : data.target === 'guest_count' ? 'guests' : 'units';
  const display = (value: number) => currency ? pesos(value) : Math.round(value).toLocaleString();
  const kpi = (value: number, suffix: string) => currency ? display(value) : `${display(value)} ${suffix}`;
  const axis = currency ? currencyTick : (value: number) => Math.round(value).toString();
  const average = forecast.reduce((sum, row) => sum + row.predicted, 0) / (forecast.length || 1);
  const historicalAverage = historical.reduce((sum, row) => sum + row.value, 0) / (historical.length || 1);
  const domain: [number, number] = data.target === 'product_demand' ? [0, Math.max(...values) + padding] : [Math.min(...values) - padding, Math.max(...values) + padding];

  return <>
    {data.selectedProduct && <article className="rounded-2xl border bg-white p-5 dark:bg-slate-900"><h3 className="font-semibold">Product Demand Forecast</h3><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><div><dt className="text-slate-500">Product</dt><dd className="font-medium">{data.selectedProduct.name}</dd></div><div><dt className="text-slate-500">Forecast Target</dt><dd className="font-medium">Product Demand</dd></div><div><dt className="text-slate-500">Unit</dt><dd className="font-medium">Units sold</dd></div></dl></article>}
    <article className="mt-6 rounded-2xl border bg-white p-5 dark:bg-slate-900"><h3 className="font-semibold">Model Validation</h3><p className="mt-2 text-sm text-slate-500">Training: Jan 1 – May 31, 2026 · Validation: Jun 1 – Jun 30, 2026 · Forecast: Jul 1 onward</p><p className="mt-2 text-sm">Validation observations: {data.metrics.validationObservations} · Excluded from MAPE (actual = 0): {data.metrics.excludedMapeObservations}</p></article>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Card title="Forecast Average" value={kpi(average, `${unit}/day`)} /><Card title="Forecast Total" value={kpi(forecast.reduce((sum, row) => sum + row.predicted, 0), unit)} /><Card title="Historical Average" value={kpi(historicalAverage, `${unit}/day`)} /><Card title="MAPE" value={data.metrics.mape === null ? '—' : `${data.metrics.mape.toFixed(2)}%`} /><Card title="RMSE" value={data.metrics.rmse === null ? '—' : kpi(data.metrics.rmse, unit)} /></div>
    <article className="mt-6 rounded-2xl border bg-white p-5 dark:bg-slate-900"><h3 className="mb-4 font-semibold">Training → Validation → Future Forecast</h3><div className="h-80"><ResponsiveContainer><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" ticks={monthTicks} tickFormatter={month} /><YAxis domain={domain} tickFormatter={axis} /><Tooltip content={<ForecastTooltip currency={currency} />} /><Legend /><ReferenceLine x="2026-06-01" stroke="#64748b" strokeDasharray="4 4" label={{ value: 'VALIDATION', position: 'top', fill: '#64748b' }} /><ReferenceLine x="2026-07-01" stroke="#64748b" strokeDasharray="4 4" label={{ value: 'FORECAST', position: 'top', fill: '#64748b' }} /><Line dataKey="Training Actual" stroke="#047857" strokeWidth={3} dot={false} /><Line dataKey="Validation Actual" stroke="#0f766e" strokeWidth={3} dot={false} /><Line dataKey="Validation Predicted" stroke="#b45309" strokeWidth={3} strokeDasharray="6 4" dot={false} /><Line dataKey="Future Forecast" stroke="#7c3aed" strokeWidth={3} strokeDasharray="6 4" dot={false} /></LineChart></ResponsiveContainer></div></article>
    <article className="mt-6 rounded-2xl border bg-white p-5 dark:bg-slate-900"><h3 className="mb-4 font-semibold">Forecast Confidence Interval</h3><div className="h-80"><ResponsiveContainer><AreaChart data={futureChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis tickFormatter={axis} /><Tooltip content={<ForecastTooltip currency={currency} />} /><Legend /><Area dataKey="Upper Bound" stroke="#d97706" fill="#fef3c7" /><Area dataKey="Lower Bound" stroke="#b45309" fill="#fff" /><Line dataKey="Forecast" stroke="#7c3aed" strokeWidth={3} /></AreaChart></ResponsiveContainer></div></article>
    <article className="mt-6 rounded-2xl border bg-white p-5 dark:bg-slate-900"><h3 className="font-semibold">Validation Results</h3><p className="mt-1 text-sm text-slate-500">SARIMA · Order (1,1,1) · Seasonal order (1,0,1,7)</p><div className="mt-4 max-h-[620px] overflow-auto"><table className="w-full min-w-[34rem] text-sm"><thead className="sticky top-0 bg-white text-left text-slate-500 dark:bg-slate-900"><tr><th>Date</th><th className="text-right">Actual</th><th className="text-right">Predicted</th><th className="text-right">Error</th></tr></thead><tbody>{validation.map((row) => <tr key={row.date} className="border-t"><td className="py-2">{row.date}</td><td className="text-right">{display(row.actual)}</td><td className="text-right">{display(row.predicted)}</td><td className="text-right">{display(Math.abs(row.error))}</td></tr>)}</tbody></table></div></article>
    <article className="mt-6 rounded-2xl border bg-white p-5 dark:bg-slate-900"><h3 className="font-semibold">Future Forecast</h3><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[34rem] text-sm"><thead className="text-left text-slate-500"><tr><th>Date</th><th className="text-right">Forecast</th><th className="text-right">Lower Bound</th><th className="text-right">Upper Bound</th></tr></thead><tbody>{forecast.map((row) => <tr key={row.date} className="border-t"><td className="py-2">{row.date}</td><td className="text-right">{display(row.predicted)}</td><td className="text-right">{display(row.lowerBound)}</td><td className="text-right">{display(row.upperBound)}</td></tr>)}</tbody></table></div></article>
  </>;
}

export function ForecastingPage() {
  const [horizon, setHorizon] = useState(14);
  const [target, setTarget] = useState<ForecastTarget>('net_sales');
  const [productId, setProductId] = useState('');
  const [result, setResult] = useState<NetSalesForecast | null>(null);
  const products = useDemandProducts();
  const generateStandard = useGenerateNetSalesForecast();
  const generateProduct = useGenerateProductDemand();
  const isGenerating = generateStandard.isPending || generateProduct.isPending;
  const generationError = target === 'product_demand' ? generateProduct.error : generateStandard.error;
  const errorMessage = generationError instanceof Error ? generationError.message : 'Unknown API error.';
  const productOptions = products.data?.products ?? [];
  const generate = () => {
    if (target === 'product_demand') {
      if (!productId) return;
      generateProduct.mutate({ productId, horizon }, { onSuccess: setResult });
      return;
    }
    generateStandard.mutate({ target, horizon }, { onSuccess: setResult });
  };

  return <section><div className="mb-6"><p className="text-sm font-medium text-amber-700">Under the Balete</p><h2 className="mt-1 text-3xl font-bold">Forecasting Center</h2><p className="mt-2 text-slate-500">Intentional SARIMA forecasting from PostgreSQL history.</p></div><div className="mb-6 flex flex-wrap items-center gap-3">{targets.map(({ value, label, enabled }) => <button key={value} disabled={!enabled} onClick={() => enabled && setTarget(value as ForecastTarget)} className={`rounded-lg px-3 py-2 text-sm ${!enabled ? 'cursor-not-allowed border opacity-50' : target === value ? 'bg-emerald-800 text-white' : 'border bg-white dark:bg-slate-900'}`}>{label}{!enabled ? ' (unavailable)' : ''}</button>)}{target === 'product_demand' && <select value={productId} onChange={(event) => setProductId(event.target.value)} disabled={products.isLoading} className="min-w-52 rounded-lg border bg-white px-3 py-2 dark:bg-slate-900"><option value="">{products.isLoading ? 'Loading products…' : 'Select product'}</option>{productOptions.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` (${product.sku})` : ''}</option>)}</select>}<select value={horizon} onChange={(event) => setHorizon(Number(event.target.value))} className="rounded-lg border bg-white px-3 py-2 dark:bg-slate-900"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select><button disabled={isGenerating || (target === 'product_demand' && !productId)} onClick={generate} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-emerald-950 disabled:cursor-not-allowed disabled:opacity-60">{isGenerating ? 'Generating Forecast…' : 'Generate Forecast'}</button></div>{products.isError && target === 'product_demand' && <ErrorState message="Unable to load products from PostgreSQL." />}{generationError && <ErrorState message={`Forecast generation failed: ${errorMessage}`} />}{isGenerating && !result ? <LoadingSkeleton className="h-96" /> : result?.available ? <Results data={result} /> : <EmptyState title={target === 'product_demand' && !productId ? 'Select a product and generate a forecast.' : result?.reason ?? 'Select a horizon and generate a forecast.'} />}</section>;
}
