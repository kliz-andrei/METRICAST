import { describe, expect, it } from 'vitest';
import {
  calculateFinancialProjection,
  FinancialProjectionService,
} from './financial-projection.service.js';
import type { FinancialProjectionRepository } from '../repositories/financial-projection.repository.js';
import type { ForecastingService } from './forecasting.service.js';

describe('financial projection calculations', () => {
  it('derives costs, profit, and margin from the documented 10% overhead example', () => {
    const result = calculateFinancialProjection({
      forecastedNetSales: 2_500_000,
      historicalNetSales: 10_000_000,
      historicalEstimatedProductCost: 4_000_000,
      overheadRate: 10,
    });

    expect(result).toEqual({
      historicalEstimatedCostRatio: 0.4,
      estimatedProductCost: 1_000_000,
      estimatedOperatingOverhead: 100_000,
      estimatedTotalCost: 1_100_000,
      estimatedProfit: 1_400_000,
      estimatedProfitMargin: 0.56,
    });
  });

  it('does not calculate a projection when historical or forecast sales are invalid', () => {
    expect(calculateFinancialProjection({ forecastedNetSales: 0, historicalNetSales: 100, historicalEstimatedProductCost: 40, overheadRate: 10 })).toBeNull();
    expect(calculateFinancialProjection({ forecastedNetSales: 100, historicalNetSales: 0, historicalEstimatedProductCost: 40, overheadRate: 10 })).toBeNull();
  });

  it('returns an explicit no-cost-configuration state without invoking SARIMA', async () => {
    const repository = {
      historicalNetSales: async () => ({ _sum: { netSales: 1_000 }, _count: { id: 1 } }),
      costCoverage: async () => [{ soldProducts: 2n, configuredProducts: 0n, missingProducts: 2n, soldItems: 3n, configuredItems: 0n, missingItems: 3n, configuredQuantity: null, missingQuantity: 5n, configuredProductCost: null }],
      settings: async () => ({ id: 'default', overheadRate: 10 }),
    };
    const forecasting = { getNetSalesForecast: async () => { throw new Error('SARIMA must not run with incomplete cost coverage.'); } };
    const service = new FinancialProjectionService(repository as unknown as FinancialProjectionRepository, forecasting as unknown as ForecastingService);

    const result = await service.getSummary({ horizon: '14' });

    expect(result.status).toBe('NO_COST_CONFIGURATION');
    expect(result.projections).toEqual([]);
    expect(result.forecast).toBeNull();
  });

  it('returns an incomplete-cost-coverage state when any sold product lacks a configured cost', async () => {
    const repository = {
      historicalNetSales: async () => ({ _sum: { netSales: 1_000 }, _count: { id: 1 } }),
      costCoverage: async () => [{ soldProducts: 2n, configuredProducts: 1n, missingProducts: 1n, soldItems: 3n, configuredItems: 2n, missingItems: 1n, configuredQuantity: 4n, missingQuantity: 1n, configuredProductCost: 400 }],
      settings: async () => ({ id: 'default', overheadRate: 10 }),
    };
    const service = new FinancialProjectionService(repository as unknown as FinancialProjectionRepository, {} as ForecastingService);

    const result = await service.getCoverage({});

    expect(result.status).toBe('INCOMPLETE_COST_COVERAGE');
    expect(result.historicalEstimatedCostRatio).toBeNull();
    expect(result.costCoverage.missingProducts).toBe(1);
  });

  it('uses the persisted daily Net Sales forecast for every financial projection row', async () => {
    const repository = {
      historicalNetSales: async () => ({ _sum: { netSales: 1_000 }, _count: { id: 1 } }),
      costCoverage: async () => [{ soldProducts: 1n, configuredProducts: 1n, missingProducts: 0n, soldItems: 2n, configuredItems: 2n, missingItems: 0n, configuredQuantity: 2n, missingQuantity: 0n, configuredProductCost: 400 }],
      settings: async () => ({ id: 'default', overheadRate: 10 }),
    };
    const forecasting = {
      getLatestNetSalesForecast: async () => ({
        available: true,
        forecastHorizon: 2,
        forecastPeriod: { start: '2026-09-01', end: '2026-09-02' },
        model: 'SARIMA',
        forecast: [
          { date: '2026-09-01', predicted: 100, lowerBound: 80, upperBound: 120 },
          { date: '2026-09-02', predicted: 150, lowerBound: 120, upperBound: 180 },
        ],
      }),
      getNetSalesForecast: async () => { throw new Error('Financial projections must use the persisted forecast.'); },
    };
    const service = new FinancialProjectionService(repository as unknown as FinancialProjectionRepository, forecasting as unknown as ForecastingService);

    const result = await service.getSummary({ horizon: '2' });

    expect(result.status).toBe('READY');
    expect(result.forecast?.forecastedNetSales).toBe(250);
    expect(result.projections.map((row) => row.forecastedNetSales)).toEqual([100, 150]);
    expect('totals' in result && result.totals?.estimatedProductCost).toBe(100);
  });
});
