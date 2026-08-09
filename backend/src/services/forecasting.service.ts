import { ForecastGranularity, type Forecast, type Prisma } from '@prisma/client';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';
import { ForecastingRepository, type ForecastFilters } from '../repositories/forecasting.repository.js';

export interface ForecastQuery {
  modelName?: string;
  granularity?: string;
  startDate?: string;
  endDate?: string;
  salesChannel?: string;
  orderType?: string;
  limit?: string;
}

const numberValue = (value: unknown): number | null => value === null || value === undefined ? null : Number(value);
const execFileAsync = promisify(execFile);
const parseStartDate = (value?: string): Date | undefined => value ? new Date(`${value}T00:00:00+08:00`) : undefined;
const parseEndDate = (value?: string): Date | undefined => value ? new Date(`${value}T23:59:59.999+08:00`) : undefined;
const isGranularity = (value?: string): value is ForecastGranularity => value !== undefined && Object.values(ForecastGranularity).includes(value as ForecastGranularity);
const forecastGranularity = (value?: string): ForecastGranularity => {
  if (!value) return ForecastGranularity.DAILY;
  const normalized = value.trim().toUpperCase();
  if (!isGranularity(normalized)) throw new AppError(422, 'granularity must be daily, weekly, or monthly.', 'INVALID_GRANULARITY');
  return normalized;
};
type ForecastTarget = 'net_sales' | 'transaction_volume' | 'guest_count' | 'product_demand';
type DailyValue = { date: string; value: number };

const completeDailySeries = (rows: DailyValue[], start: string, end: string): DailyValue[] => {
  const valuesByDate = new Map(rows.map((row) => [row.date, row.value]));
  const series: DailyValue[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const finalDate = new Date(`${end}T00:00:00Z`);
  while (cursor <= finalDate) {
    const date = cursor.toISOString().slice(0, 10);
    series.push({ date, value: valuesByDate.get(date) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return series;
};

export class ForecastingService {
  constructor(private readonly repository = new ForecastingRepository()) {}

  private filters(query: ForecastQuery): ForecastFilters {
    return {
      modelName: query.modelName || undefined,
      granularity: isGranularity(query.granularity) ? query.granularity : undefined,
      startDate: parseStartDate(query.startDate),
      endDate: parseEndDate(query.endDate)
    };
  }

  private serialize(forecast: Forecast) {
    return {
      id: forecast.id,
      modelName: forecast.modelName,
      granularity: forecast.granularity,
      targetDate: forecast.targetDate.toISOString(),
      predicted: Number(forecast.predicted),
      lowerBound: numberValue(forecast.lowerBound),
      upperBound: numberValue(forecast.upperBound),
      actual: numberValue(forecast.actual),
      mae: numberValue(forecast.mae),
      mape: numberValue(forecast.mape),
      generatedAt: forecast.generatedAt.toISOString(),
      metadata: forecast.metadata
    };
  }

  async getModels() {
    const models = await this.repository.models();

    return {
      models: models.map((model) => ({
        modelName: model.modelName,
        granularity: model.granularity,
        forecastCount: model._count.id,
        lastGeneratedAt: model._max.generatedAt?.toISOString() ?? null,
        latestTargetDate: model._max.targetDate?.toISOString() ?? null
      })).sort((left, right) => left.modelName.localeCompare(right.modelName) || left.granularity.localeCompare(right.granularity))
    };
  }

  async getHistory(query: ForecastQuery) {
    const parsedLimit = Number(query.limit);
    const take = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 500) : 100;
    const forecasts = await this.repository.history(this.filters(query), take);

    return { forecasts: forecasts.map((forecast) => this.serialize(forecast)) };
  }

  async getLatest(query: ForecastQuery) {
    const filters = this.filters(query);
    const latest = await this.repository.latestGeneration(filters);

    if (!latest) return { latest: null, forecasts: [] };

    const forecasts = await this.repository.forecastsForGeneration(latest.modelName, latest.granularity, latest.generatedAt);

    return {
      latest: {
        modelName: latest.modelName,
        granularity: latest.granularity,
        generatedAt: latest.generatedAt.toISOString()
      },
      forecasts: forecasts.map((forecast) => this.serialize(forecast))
    };
  }

  async getSalesForecast(granularityInput?: string) {
    const granularity = forecastGranularity(granularityInput);
    const latest = await this.repository.latestGeneration({ granularity });

    if (!latest) {
      return {
        modelName: null,
        granularity,
        generatedAt: null,
        historicalValues: [],
        forecastValues: [],
        confidenceInterval: []
      };
    }

    const forecasts = await this.repository.forecastsForGeneration(latest.modelName, granularity, latest.generatedAt);

    return {
      modelName: latest.modelName,
      granularity,
      generatedAt: latest.generatedAt.toISOString(),
      historicalValues: forecasts.filter((forecast) => forecast.actual !== null).map((forecast) => ({
        targetDate: forecast.targetDate.toISOString(),
        actualRevenue: Number(forecast.actual)
      })),
      forecastValues: forecasts.map((forecast) => ({
        targetDate: forecast.targetDate.toISOString(),
        predictedRevenue: Number(forecast.predicted),
        actualRevenue: numberValue(forecast.actual)
      })),
      confidenceInterval: forecasts.map((forecast) => ({
        targetDate: forecast.targetDate.toISOString(),
        lowerBound: numberValue(forecast.lowerBound),
        upperBound: numberValue(forecast.upperBound)
      }))
    };
  }

  async getGuestForecast(granularityInput?: string) {
    const granularity = forecastGranularity(granularityInput);
    const latest = await this.repository.latestGuestGeneration(granularity);

    if (!latest) {
      return {
        modelName: null,
        granularity,
        generatedAt: null,
        historical: [],
        forecast: [],
        confidenceInterval: []
      };
    }

    const forecasts = await this.repository.forecastsForGeneration(latest.modelName, granularity, latest.generatedAt);

    return {
      modelName: latest.modelName,
      granularity,
      generatedAt: latest.generatedAt.toISOString(),
      historical: forecasts.filter((forecast) => forecast.actual !== null).map((forecast) => ({
        targetDate: forecast.targetDate.toISOString(),
        actualGuests: Number(forecast.actual)
      })),
      forecast: forecasts.map((forecast) => ({
        targetDate: forecast.targetDate.toISOString(),
        predictedGuests: Number(forecast.predicted),
        actualGuests: numberValue(forecast.actual)
      })),
      confidenceInterval: forecasts.map((forecast) => ({
        targetDate: forecast.targetDate.toISOString(),
        lowerBound: numberValue(forecast.lowerBound),
        upperBound: numberValue(forecast.upperBound)
      }))
    };
  }

  async getTransactionForecast(granularityInput?: string) {
    const granularity = forecastGranularity(granularityInput);
    const latest = await this.repository.latestTransactionGeneration(granularity);

    if (!latest) {
      return {
        modelName: null,
        granularity,
        generatedAt: null,
        historical: [],
        forecast: [],
        confidenceInterval: []
      };
    }

    const forecasts = await this.repository.forecastsForGeneration(latest.modelName, granularity, latest.generatedAt);

    return {
      modelName: latest.modelName,
      granularity,
      generatedAt: latest.generatedAt.toISOString(),
      historical: forecasts.filter((forecast) => forecast.actual !== null).map((forecast) => ({
        targetDate: forecast.targetDate.toISOString(),
        actualTransactions: Number(forecast.actual)
      })),
      forecast: forecasts.map((forecast) => ({
        targetDate: forecast.targetDate.toISOString(),
        predictedTransactions: Number(forecast.predicted),
        actualTransactions: numberValue(forecast.actual)
      })),
      confidenceInterval: forecasts.map((forecast) => ({
        targetDate: forecast.targetDate.toISOString(),
        lowerBound: numberValue(forecast.lowerBound),
        upperBound: numberValue(forecast.upperBound)
      }))
    };
  }

  async getProductForecast(query: ForecastQuery) {
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 10);
    const filters = { ...this.filters(query), salesChannel: query.salesChannel, orderType: query.orderType };
    const metrics = await this.repository.topProducts(filters, limit);
    const productIds = metrics.map((metric) => metric.productId);
    const [details, history, forecasts] = await Promise.all([this.repository.productDetails(productIds), this.repository.productHistory(productIds, filters), this.repository.productForecasts(filters)]);
    const detailsById = new Map(details.map((product) => [product.id, product]));
    const historyByProduct = new Map<string, Array<{ date: string; quantity: number; revenue: number }>>();
    for (const row of history) historyByProduct.set(row.productId, [...(historyByProduct.get(row.productId) ?? []), { date: row.date, quantity: Number(row.quantity), revenue: Number(row.revenue) }]);
    const forecastByProduct = new Map<string, Array<Record<string, unknown>>>();
    for (const forecast of forecasts) {
      const metadata = forecast.metadata as Prisma.JsonObject | null;
      const productId = metadata && typeof metadata.productId === 'string' ? metadata.productId : null;
      const metric = metadata && typeof metadata.metric === 'string' ? metadata.metric : null;
      if (!productId || !productIds.includes(productId) || (metric !== 'quantity' && metric !== 'revenue')) continue;
      const values = forecastByProduct.get(productId) ?? [];
      values.push({ targetDate: forecast.targetDate.toISOString(), metric, predicted: Number(forecast.predicted), actual: numberValue(forecast.actual), lowerBound: numberValue(forecast.lowerBound), upperBound: numberValue(forecast.upperBound), generatedAt: forecast.generatedAt.toISOString() });
      forecastByProduct.set(productId, values);
    }
    return { products: metrics.map((metric) => { const product = detailsById.get(metric.productId); if (!product) throw new Error(`Product ${metric.productId} referenced by a transaction item does not exist.`); const forecastValues = forecastByProduct.get(metric.productId) ?? []; return { productId: product.id, productName: product.name, category: product.category.name, quantitySold: Number(metric._sum.quantity ?? 0), revenue: Number(metric._sum.salesAmount ?? 0), historical: historyByProduct.get(product.id) ?? [], forecast: forecastValues, confidenceInterval: forecastValues.map(({ targetDate, metric, lowerBound, upperBound }) => ({ targetDate, metric, lowerBound, upperBound })) }; }) };
  }

  async getCategoryForecast(query: ForecastQuery) {
    const filters = { ...this.filters(query), salesChannel: query.salesChannel, orderType: query.orderType };
    const [history, forecasts] = await Promise.all([this.repository.categoryHistory(filters), this.repository.categoryForecasts(filters)]);
    const historicalByCategory = new Map<string, Array<{ date: string; quantity: number; revenue: number }>>();
    for (const row of history) historicalByCategory.set(row.category, [...(historicalByCategory.get(row.category) ?? []), { date: row.date, quantity: Number(row.quantity), revenue: Number(row.revenue) }]);
    const forecastByCategory = new Map<string, Array<Record<string, unknown>>>();
    for (const forecast of forecasts) {
      const metadata = forecast.metadata as Prisma.JsonObject | null;
      const category = metadata && typeof metadata.category === 'string' ? metadata.category : null;
      const metric = metadata && typeof metadata.metric === 'string' ? metadata.metric : null;
      if (!category || (metric !== 'quantity' && metric !== 'revenue')) continue;
      const values = forecastByCategory.get(category) ?? [];
      values.push({ targetDate: forecast.targetDate.toISOString(), metric, predicted: Number(forecast.predicted), actual: numberValue(forecast.actual), lowerBound: numberValue(forecast.lowerBound), upperBound: numberValue(forecast.upperBound), generatedAt: forecast.generatedAt.toISOString() });
      forecastByCategory.set(category, values);
    }
    const categories = new Set([...historicalByCategory.keys(), ...forecastByCategory.keys()]);
    return { categories: [...categories].sort((left, right) => left.localeCompare(right)).map((category) => { const forecastValues = forecastByCategory.get(category) ?? []; return { category, historical: historicalByCategory.get(category) ?? [], forecast: forecastValues, confidenceInterval: forecastValues.map(({ targetDate, metric, lowerBound, upperBound }) => ({ targetDate, metric, lowerBound, upperBound })) }; }) };
  }

  async getAccuracy() {
    const accuracy = await this.repository.accuracy();
    return { models: accuracy.map((model) => ({ modelName: model.modelName, granularity: model.granularity, mae: numberValue(model.mae), rmse: numberValue(model.rmse), mape: numberValue(model.mape), sampleSize: Number(model.sampleSize) })) };
  }

  async getNetSalesForecast(horizonInput?: string, target: ForecastTarget = 'net_sales', productId?: string) {
    const horizon = Math.min(Math.max(Number(horizonInput) || 14, 1), 90);
    const selectedProduct = target === 'product_demand' && productId ? await this.repository.forecastProduct(productId) : null;
    const unavailable = (reason: string, product = selectedProduct) => ({ target, selectedProduct: product, available: false, reason, model: 'SARIMA' as const, order: [1, 1, 1], seasonalOrder: [1, 0, 1, 7], metrics: { mape: null, rmse: null, validationObservations: 0, excludedMapeObservations: 0 }, historical: [], validation: [], forecast: [], trainingPeriod: null, validationPeriod: null, forecastPeriod: null, forecastHorizon: horizon });
    if (target === 'product_demand' && !selectedProduct) return unavailable('The selected product does not exist or has no imported sales records.', null);

    const rows = target === 'product_demand' && productId ? await this.repository.dailyProductDemand(productId) : target === 'transaction_volume' ? await this.repository.dailyTransactionVolume() : target === 'guest_count' ? await this.repository.dailyGuestCount() : await this.repository.dailyNetSales();
    const observedHistorical = rows.map((row) => ({ date: row.date, value: Number(row.value) }));
    if (target === 'product_demand' && observedHistorical.length < 30) return unavailable('Insufficient historical data for this product. At least 30 days with recorded sales are required.');
    const historical = target === 'product_demand' ? completeDailySeries(observedHistorical, '2026-01-01', '2026-06-30') : observedHistorical;
    if (historical.length < 30) return unavailable('The required Jan–May training and June validation data is unavailable.');

    try {
      const script = fileURLToPath(new URL('../../../forecast-service/sarima_forecast.py', import.meta.url));
      const localPython = fileURLToPath(new URL('../../../forecast-service/.venv/Scripts/python.exe', import.meta.url));
      const python = env.FORECAST_PYTHON_PATH ?? (process.platform === 'win32' && existsSync(localPython) ? localPython : 'python');
      const { stdout } = await execFileAsync(python, [script, JSON.stringify({ series: historical, horizon })], { maxBuffer: 1024 * 1024 * 8 });
      const result = JSON.parse(stdout) as { available: boolean; reason?: string; historical: DailyValue[]; validation?: Array<{ date: string; actual: number; predicted: number; error: number }>; forecast: Array<{ predicted: number; lowerBound: number; upperBound: number }>; metrics: { mape: number | null; rmse: number | null; validationObservations?: number; excludedMapeObservations?: number } };
      const last = new Date(`${historical[historical.length - 1].date}T00:00:00Z`);
      const forecast = result.forecast.map((point, index) => {
        const date = new Date(last);
        date.setUTCDate(date.getUTCDate() + index + 1);
        const predicted = target === 'product_demand' ? Math.max(0, point.predicted) : point.predicted;
        const lowerBound = target === 'product_demand' ? Math.max(0, point.lowerBound) : point.lowerBound;
        const upperBound = target === 'product_demand' ? Math.max(predicted, point.upperBound, 0) : point.upperBound;
        return { date: date.toISOString().slice(0, 10), predicted, actual: null, error: null, lowerBound, upperBound };
      });
      const validation = result.validation ?? [];
      return { target, selectedProduct, available: result.available, reason: result.reason ?? null, model: 'SARIMA' as const, order: [1, 1, 1], seasonalOrder: [1, 0, 1, 7], metrics: { mape: result.metrics.mape, rmse: result.metrics.rmse, validationObservations: result.metrics.validationObservations ?? validation.length, excludedMapeObservations: result.metrics.excludedMapeObservations ?? 0 }, historical: result.historical ?? [], validation, forecast, trainingPeriod: { start: '2026-01-01', end: '2026-05-31', days: result.historical?.length ?? 0 }, validationPeriod: { start: '2026-06-01', end: '2026-06-30', days: validation.length }, forecastPeriod: forecast.length ? { start: forecast[0].date, end: forecast[forecast.length - 1].date } : null, forecastHorizon: horizon };
    } catch (error) {
      return unavailable(`SARIMA runtime is unavailable. Configure FORECAST_PYTHON_PATH or create forecast-service/.venv and install requirements.txt. ${error instanceof Error ? error.message : ''}`.trim());
    }
  }
  getTransactionVolumeForecast(horizon?: string) { return this.getNetSalesForecast(horizon, 'transaction_volume'); }
  getGuestCountForecast(horizon?: string) { return this.getNetSalesForecast(horizon, 'guest_count'); }
  async getForecastProducts() { return { products: await this.repository.forecastProducts() }; }
  getProductDemandForecast(productId: string, horizon?: string) { return this.getNetSalesForecast(horizon, 'product_demand', productId); }
}
