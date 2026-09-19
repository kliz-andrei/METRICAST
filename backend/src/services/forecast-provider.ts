import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { env } from '../config/env.js';

export type DailyValue = { date: string; value: number };

export type SarimaForecastResult = {
  available: boolean;
  reason?: string;
  historical: DailyValue[];
  validation: Array<{ date: string; actual: number; predicted: number; error: number }>;
  forecast: Array<{ predicted: number; lowerBound: number; upperBound: number }>;
  metrics: {
    mape: number | null;
    rmse: number | null;
    validationObservations?: number;
    excludedMapeObservations?: number;
  };
};

export interface ForecastProvider {
  forecast(payload: { series: DailyValue[]; horizon: number }): Promise<SarimaForecastResult>;
}

const dailyValueSchema = z.object({ date: z.string(), value: z.number().finite() });
const sarimaResultSchema = z.object({
  available: z.boolean(),
  reason: z.string().optional(),
  historical: z.array(dailyValueSchema).default([]),
  validation: z.array(z.object({
    date: z.string(),
    actual: z.number().finite(),
    predicted: z.number().finite(),
    error: z.number().finite()
  })).default([]),
  forecast: z.array(z.object({
    predicted: z.number().finite(),
    lowerBound: z.number().finite(),
    upperBound: z.number().finite()
  })).default([]),
  metrics: z.object({
    mape: z.number().finite().nullable(),
    rmse: z.number().finite().nullable(),
    validationObservations: z.number().int().nonnegative().optional(),
    excludedMapeObservations: z.number().int().nonnegative().optional()
  })
});

const parseResult = (value: unknown): SarimaForecastResult => sarimaResultSchema.parse(value);

const runSarima = (python: string, script: string, payload: unknown) =>
  new Promise<string>((resolve, reject) => {
    const process = spawn(python, [script], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    const maxOutputLength = 8 * 1024 * 1024;
    const append = (current: string, chunk: Buffer) => {
      const next = current + chunk.toString();
      if (next.length > maxOutputLength) {
        process.kill();
        reject(new Error('SARIMA runtime output exceeded the safe size limit.'));
      }
      return next;
    };

    process.once('error', reject);
    process.stdout.on('data', (chunk: Buffer) => { stdout = append(stdout, chunk); });
    process.stderr.on('data', (chunk: Buffer) => { stderr = append(stderr, chunk); });
    process.once('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`SARIMA runtime exited with code ${code ?? 'unknown'}${stderr ? `: ${stderr.trim()}` : ''}`));
    });
    process.stdin.end(JSON.stringify(payload));
  });

export class LocalSarimaForecastProvider implements ForecastProvider {
  async forecast(payload: { series: DailyValue[]; horizon: number }) {
    const script = fileURLToPath(new URL('../../../forecast-service/sarima_forecast.py', import.meta.url));
    const localPython = fileURLToPath(new URL('../../../forecast-service/.venv/Scripts/python.exe', import.meta.url));
    const python = env.FORECAST_PYTHON_PATH ?? (process.platform === 'win32' && existsSync(localPython) ? localPython : 'python');
    return parseResult(JSON.parse(await runSarima(python, script, payload)));
  }
}

export class RemoteSarimaForecastProvider implements ForecastProvider {
  async forecast(payload: { series: DailyValue[]; horizon: number }) {
    if (!env.FORECAST_SERVICE_URL || !env.FORECAST_SERVICE_TOKEN) {
      throw new Error('Remote forecasting is not configured. Set FORECAST_SERVICE_URL and FORECAST_SERVICE_TOKEN.');
    }

    let endpoint: URL;
    try {
      endpoint = new URL('/forecast', env.FORECAST_SERVICE_URL);
    } catch {
      throw new Error('FORECAST_SERVICE_URL is not a valid URL.');
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.FORECAST_SERVICE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(env.FORECAST_SERVICE_TIMEOUT_MS)
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = typeof body === 'object' && body !== null && 'detail' in body ? String(body.detail) : response.statusText;
        throw new Error(`Remote forecasting service returned HTTP ${response.status}: ${detail}`);
      }
      return parseResult(body);
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error(`Remote forecasting service timed out after ${env.FORECAST_SERVICE_TIMEOUT_MS}ms.`);
      }
      throw error;
    }
  }
}

export const createForecastProvider = (): ForecastProvider =>
  env.FORECAST_SERVICE_MODE === 'remote'
    ? new RemoteSarimaForecastProvider()
    : new LocalSarimaForecastProvider();
