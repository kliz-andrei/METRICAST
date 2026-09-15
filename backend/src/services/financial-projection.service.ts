import { ForecastingService } from './forecasting.service.js';
import {
  FinancialProjectionRepository,
  type FinancialProjectionFilters,
} from '../repositories/financial-projection.repository.js';

export interface FinancialProjectionQuery {
  startDate?: string;
  endDate?: string;
  salesChannel?: string;
  salesChannels?: string[];
  orderType?: string;
  horizon?: string;
}

type ProjectionStatus =
  | 'READY'
  | 'INCOMPLETE_COST_COVERAGE'
  | 'NO_COST_CONFIGURATION'
  | 'NO_HISTORICAL_SALES'
  | 'FORECAST_UNAVAILABLE'
  | 'INVALID_FORECAST_SALES';

const asNumber = (value: unknown) => Number(value ?? 0);
const parseStartDate = (value?: string) => value ? new Date(`${value}T00:00:00+08:00`) : undefined;
const parseEndDate = (value?: string) => value ? new Date(`${value}T23:59:59.999+08:00`) : undefined;
const validHorizon = (value?: string) => Math.min(Math.max(Number(value) || 14, 1), 90);

export interface ProjectionCalculationInput {
  forecastedNetSales: number;
  historicalNetSales: number;
  historicalEstimatedProductCost: number;
  overheadRate: number;
}

export const calculateFinancialProjection = ({
  forecastedNetSales,
  historicalNetSales,
  historicalEstimatedProductCost,
  overheadRate,
}: ProjectionCalculationInput) => {
  if (historicalNetSales <= 0 || forecastedNetSales <= 0) return null;

  const historicalEstimatedCostRatio = historicalEstimatedProductCost / historicalNetSales;
  const estimatedProductCost = forecastedNetSales * historicalEstimatedCostRatio;
  const estimatedOperatingOverhead = estimatedProductCost * (overheadRate / 100);
  const estimatedTotalCost = estimatedProductCost + estimatedOperatingOverhead;
  const estimatedProfit = forecastedNetSales - estimatedTotalCost;

  return {
    historicalEstimatedCostRatio,
    estimatedProductCost,
    estimatedOperatingOverhead,
    estimatedTotalCost,
    estimatedProfit,
    estimatedProfitMargin: estimatedProfit / forecastedNetSales,
  };
};

export class FinancialProjectionService {
  constructor(
    private readonly repository = new FinancialProjectionRepository(),
    private readonly forecasting = new ForecastingService(),
  ) {}

  private filters(query: FinancialProjectionQuery): FinancialProjectionFilters {
    return {
      startDate: parseStartDate(query.startDate),
      endDate: parseEndDate(query.endDate),
      salesChannel: query.salesChannel || undefined,
      salesChannels: query.salesChannels?.length ? query.salesChannels : undefined,
      orderType: query.orderType || undefined,
    };
  }

  private async historicalBasis(query: FinancialProjectionQuery) {
    const filters = this.filters(query);
    const [sales, coverageRows, settings] = await Promise.all([
      this.repository.historicalNetSales(filters),
      this.repository.costCoverage(filters),
      this.repository.settings(),
    ]);
    const coverage = coverageRows[0];
    const historicalNetSales = asNumber(sales._sum.netSales);
    const historicalEstimatedProductCost = asNumber(coverage?.configuredProductCost);
    const soldProducts = Number(coverage?.soldProducts ?? 0);
    const configuredProducts = Number(coverage?.configuredProducts ?? 0);
    const missingProducts = Number(coverage?.missingProducts ?? 0);
    const soldItems = Number(coverage?.soldItems ?? 0);
    const configuredItems = Number(coverage?.configuredItems ?? 0);
    const missingItems = Number(coverage?.missingItems ?? 0);

    const costCoverage = {
      soldProducts,
      configuredProducts,
      missingProducts,
      soldItems,
      configuredItems,
      missingItems,
      configuredQuantity: Number(coverage?.configuredQuantity ?? 0),
      missingQuantity: Number(coverage?.missingQuantity ?? 0),
      configuredProductCost: historicalEstimatedProductCost,
      productCoveragePercent: soldProducts === 0 ? 0 : (configuredProducts / soldProducts) * 100,
      itemCoveragePercent: soldItems === 0 ? 0 : (configuredItems / soldItems) * 100,
    };

    let status: ProjectionStatus = 'READY';
    if (historicalNetSales <= 0 || sales._count.id === 0) status = 'NO_HISTORICAL_SALES';
    else if (configuredProducts === 0) status = 'NO_COST_CONFIGURATION';
    else if (missingProducts > 0) status = 'INCOMPLETE_COST_COVERAGE';

    return {
      status,
      historicalNetSales,
      historicalEstimatedProductCost,
      historicalEstimatedCostRatio:
        status === 'READY' ? historicalEstimatedProductCost / historicalNetSales : null,
      costCoverage,
      overheadRate: asNumber(settings.overheadRate),
    };
  }

  async getCoverage(query: FinancialProjectionQuery) {
    const basis = await this.historicalBasis(query);
    return {
      status: basis.status,
      historicalNetSales: basis.historicalNetSales,
      historicalEstimatedProductCost: basis.historicalEstimatedProductCost,
      historicalEstimatedCostRatio: basis.historicalEstimatedCostRatio,
      costCoverage: basis.costCoverage,
    };
  }

  async getSummary(query: FinancialProjectionQuery) {
    const basis = await this.historicalBasis(query);
    const assumptions = {
      forecastModel: 'SARIMA',
      costBasis: 'Configured Product Unit Costs',
      costRelationship: 'Historical Estimated Cost Ratio',
      operatingOverheadRate: basis.overheadRate,
      projectionType: 'Estimated',
    };

    if (basis.status !== 'READY') {
      return { ...basis, assumptions, forecast: null, projections: [] };
    }

    const forecast = await this.forecasting.getNetSalesForecast(String(validHorizon(query.horizon)));
    if (!forecast.available) {
      return {
        ...basis,
        status: 'FORECAST_UNAVAILABLE' as const,
        assumptions,
        forecast: { available: false, reason: forecast.reason },
        projections: [],
      };
    }

    const forecastedNetSales = forecast.forecast.reduce((sum, row) => sum + row.predicted, 0);
    if (forecastedNetSales <= 0) {
      return {
        ...basis,
        status: 'INVALID_FORECAST_SALES' as const,
        assumptions,
        forecast: { available: true, forecastedNetSales, horizon: forecast.forecastHorizon },
        projections: [],
      };
    }

    const totals = calculateFinancialProjection({
      forecastedNetSales,
      historicalNetSales: basis.historicalNetSales,
      historicalEstimatedProductCost: basis.historicalEstimatedProductCost,
      overheadRate: basis.overheadRate,
    });

    if (!totals) {
      return { ...basis, status: 'INVALID_FORECAST_SALES' as const, assumptions, forecast: null, projections: [] };
    }

    const projections = forecast.forecast.map((row) => {
      const projection = calculateFinancialProjection({
        forecastedNetSales: row.predicted,
        historicalNetSales: basis.historicalNetSales,
        historicalEstimatedProductCost: basis.historicalEstimatedProductCost,
        overheadRate: basis.overheadRate,
      });
      return { date: row.date, forecastedNetSales: row.predicted, ...projection };
    });

    return {
      ...basis,
      status: 'READY' as const,
      assumptions,
      forecast: {
        available: true,
        forecastedNetSales,
        horizon: forecast.forecastHorizon,
        forecastPeriod: forecast.forecastPeriod,
        model: forecast.model,
      },
      totals,
      projections,
    };
  }

  async getSettings() {
    const settings = await this.repository.settings();
    return { id: settings.id, overheadRate: asNumber(settings.overheadRate) };
  }

  async updateSettings(overheadRate: number) {
    const settings = await this.repository.updateSettings(overheadRate);
    return { id: settings.id, overheadRate: asNumber(settings.overheadRate) };
  }

  async getProducts() {
    const products = await this.repository.products();
    return {
      products: products.map((product) => ({
        ...product,
        unitCost: product.unitCost === null ? null : asNumber(product.unitCost),
      })),
    };
  }

  async updateProductCost(id: string, unitCost: number | null) {
    const product = await this.repository.updateProductCost(id, unitCost);
    return { ...product, unitCost: product.unitCost === null ? null : asNumber(product.unitCost) };
  }
}
