import { describe, expect, it, vi } from 'vitest';
import type { ForecastingRepository } from '../repositories/forecasting.repository.js';
import type { ForecastProvider } from './forecast-provider.js';
import { ForecastingService } from './forecasting.service.js';

const provider: ForecastProvider = {
  forecast: vi.fn().mockResolvedValue({
    available: true,
    historical: [{ date: '2026-01-01', value: 100 }],
    validation: [{ date: '2026-06-01', actual: 100, predicted: 90, error: 10 }],
    forecast: [{ predicted: 110, lowerBound: 90, upperBound: 130 }],
    metrics: { mape: 10, rmse: 10, validationObservations: 1, excludedMapeObservations: 0 }
  })
};

describe('ForecastingService persisted Net Sales forecasts', () => {
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

    await expect(service.getLatestNetSalesForecast('14')).resolves.toMatchObject({
      available: true,
      forecastHorizon: 7,
      forecast: [{ date: '2026-01-31', predicted: 110 }]
    });
    expect(provider.forecast).not.toHaveBeenCalled();
  });
});
