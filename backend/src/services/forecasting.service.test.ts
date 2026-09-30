import { describe, expect, it, vi } from 'vitest';
import type { ForecastingRepository } from '../repositories/forecasting.repository.js';
import type { ForecastProvider } from './forecast-provider.js';
import { ForecastingService } from './forecasting.service.js';

const provider: ForecastProvider = {
  forecast: vi.fn().mockImplementation(async ({ horizon }: { horizon: number }) => ({
    available: true,
    historical: [{ date: '2026-01-01', value: 100 }],
    validation: [{ date: '2026-06-01', actual: 100, predicted: 90, error: 10 }],
    forecast: Array.from({ length: horizon }, () => ({ predicted: 110, lowerBound: 90, upperBound: 130 })),
    metrics: { mape: 10, rmse: 10, validationObservations: 1, excludedMapeObservations: 0 }
  }))
};

describe('ForecastingService persisted Net Sales forecasts', () => {
  it('returns the complete observed series and begins the forecast after its latest actual date', async () => {
    const observedSeries = Array.from({ length: 30 }, (_, index) => {
      const date = new Date('2026-05-04T00:00:00Z');
      date.setUTCDate(date.getUTCDate() + index);
      return { date: date.toISOString().slice(0, 10), value: 100 + index };
    });
    const repository = {
      dailyNetSales: vi.fn().mockResolvedValue(observedSeries)
    } as unknown as ForecastingRepository;
    const service = new ForecastingService(repository, provider);

    const result = await service.getNetSalesForecast('7');

    expect(result.historical).toEqual(observedSeries);
    expect(result.forecast[0]?.date).toBe('2026-06-03');
  });

  it('fills no-transaction dates with zero before forecasting and advances from the latest actual date', async () => {
    const observedSeries = Array.from({ length: 31 }, (_, index) => {
      const date = new Date('2026-01-01T00:00:00Z');
      date.setUTCDate(date.getUTCDate() + index);
      return { date: date.toISOString().slice(0, 10), value: 100 };
    }).filter((row) => row.date !== '2026-01-15');
    const repository = {
      dailyNetSales: vi.fn().mockResolvedValue(observedSeries)
    } as unknown as ForecastingRepository;
    const service = new ForecastingService(repository, provider);

    const result = await service.getNetSalesForecast('7');

    expect(result.historical).toHaveLength(31);
    expect(result.historical.find((row) => row.date === '2026-01-15')).toEqual({ date: '2026-01-15', value: 0 });
    expect(result.forecast[0]?.date).toBe('2026-02-01');
  });

  it('derives a fourteen-day production forecast after an August 31 actual cutoff', async () => {
    const observedSeries = Array.from({ length: 243 }, (_, index) => {
      const date = new Date('2026-01-01T00:00:00Z');
      date.setUTCDate(date.getUTCDate() + index);
      return { date: date.toISOString().slice(0, 10), value: 100 };
    });
    const repository = {
      dailyNetSales: vi.fn().mockResolvedValue(observedSeries)
    } as unknown as ForecastingRepository;
    const service = new ForecastingService(repository, provider);

    const result = await service.getNetSalesForecast('14');

    expect(result.forecast).toHaveLength(14);
    expect(result.forecastPeriod).toEqual({ start: '2026-09-01', end: '2026-09-14' });
  });

  it('reports the validation-model training window instead of the production refit window', async () => {
    const observedSeries = Array.from({ length: 243 }, (_, index) => {
      const date = new Date('2026-01-01T00:00:00Z');
      date.setUTCDate(date.getUTCDate() + index);
      return { date: date.toISOString().slice(0, 10), value: 100 };
    });
    const validationProvider: ForecastProvider = {
      forecast: vi.fn().mockResolvedValue({
        available: true,
        historical: Array.from({ length: 151 }, (_, index) => {
          const date = new Date('2026-01-01T00:00:00Z');
          date.setUTCDate(date.getUTCDate() + index);
          return { date: date.toISOString().slice(0, 10), value: 100 };
        }),
        validation: Array.from({ length: 30 }, (_, index) => ({
          date: `2026-06-${String(index + 1).padStart(2, '0')}`,
          actual: 100,
          predicted: 100,
          error: 0
        })),
        forecast: Array.from({ length: 7 }, () => ({ predicted: 110, lowerBound: 90, upperBound: 130 })),
        metrics: { mape: 0, rmse: 0, validationObservations: 30, excludedMapeObservations: 0 }
      })
    };
    const repository = { dailyNetSales: vi.fn().mockResolvedValue(observedSeries) } as unknown as ForecastingRepository;

    const result = await new ForecastingService(repository, validationProvider).getNetSalesForecast('7');

    expect(result.trainingPeriod).toEqual({ start: '2026-01-01', end: '2026-05-31', days: 151 });
    expect(result.validationPeriod).toEqual({ start: '2026-06-01', end: '2026-06-30', days: 30 });
  });

  it('uses the requested validation range while keeping all earlier observations for training', async () => {
    const observedSeries = Array.from({ length: 62 }, (_, index) => {
      const date = new Date('2026-01-01T00:00:00Z');
      date.setUTCDate(date.getUTCDate() + index);
      return { date: date.toISOString().slice(0, 10), value: 100 };
    });
    const validationProvider: ForecastProvider = {
      forecast: vi.fn().mockResolvedValue({
        available: true,
        historical: Array.from({ length: 31 }, (_, index) => ({
          date: `2026-01-${String(index + 1).padStart(2, '0')}`,
          value: 100
        })),
        validation: [
          { date: '2026-02-01', actual: 100, predicted: 90, error: -10 },
          { date: '2026-02-02', actual: 100, predicted: 110, error: 10 },
          { date: '2026-02-03', actual: 100, predicted: 100, error: 0 }
        ],
        forecast: [],
        metrics: { mape: 10, rmse: 10, validationObservations: 3, excludedMapeObservations: 0 }
      })
    };
    const repository = { dailyNetSales: vi.fn().mockResolvedValue(observedSeries) } as unknown as ForecastingRepository;

    const result = await new ForecastingService(repository, validationProvider).getNetSalesValidation({
      startDate: '2026-02-01',
      endDate: '2026-02-03'
    });

    expect(result).toMatchObject({
      available: true,
      trainingPeriod: { start: '2026-01-01', end: '2026-01-31', days: 31 },
      validationPeriod: { start: '2026-02-01', end: '2026-02-03', days: 3 }
    });
    expect(validationProvider.forecast).toHaveBeenCalledWith(expect.objectContaining({
      validationStart: '2026-02-01',
      validationEnd: '2026-02-03',
      validationOnly: true
    }));
  });

  it('persists a successful generation and serves it without rerunning SARIMA', async () => {
    const saveNetSalesGeneration = vi.fn().mockResolvedValue({ count: 1 });
    const repository = {
      dailyNetSales: vi.fn().mockResolvedValue(Array.from({ length: 30 }, (_, index) => ({ date: `2026-01-${String(index + 1).padStart(2, '0')}`, value: 100 }))),
      saveNetSalesGeneration,
      latestNetSalesSnapshot: vi.fn()
    } as unknown as ForecastingRepository;
    const service = new ForecastingService(repository, provider);

    const generated = await service.generateNetSalesForecast('7');
    expect(generated.available).toBe(true);
    expect(saveNetSalesGeneration).toHaveBeenCalledOnce();

    const snapshot = saveNetSalesGeneration.mock.calls[0][1];
    vi.mocked(repository.latestNetSalesSnapshot).mockResolvedValue({ metadata: { result: snapshot } } as never);
    vi.mocked(provider.forecast).mockClear();

    const latest = await service.getLatestNetSalesForecast('14');
    expect(latest).toMatchObject({
      available: true,
      forecastHorizon: 7,
      historical: Array.from({ length: 30 }, (_, index) => ({
        date: `2026-01-${String(index + 1).padStart(2, '0')}`,
        value: 100
      }))
    });
    expect(latest.forecast[0]).toMatchObject({ date: '2026-01-31', predicted: 110 });
    expect(provider.forecast).not.toHaveBeenCalled();
  });
});
