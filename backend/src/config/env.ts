import 'dotenv/config';
import { z } from 'zod';

const optionalDefault = (value: unknown) => {
  if (value === undefined || value === null || value === 0) return undefined;
  if (typeof value === 'string' && (value.trim() === '' || value.trim() === '0')) return undefined;
  return value;
};

const optionalString = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const trustProxy = (value: unknown) => {
  if (value === undefined || value === null || value === false) return false;
  if (value === true) return 1;
  if (typeof value !== 'string') return value;

  const normalized = value.trim().toLowerCase();
  if (normalized === '' || normalized === 'false' || normalized === '0') return false;
  if (normalized === 'true') return 1;
  return /^\d+$/.test(normalized) ? Number(normalized) : value;
};

const environment = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Vercel exposes PORT=0 to serverless functions; a listener is not started
  // there, so use the local-development default instead of rejecting startup.
  PORT: z.preprocess(optionalDefault, z.coerce.number().int().positive().default(4000)),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.preprocess(optionalString, z.string().default('15m')),
  JWT_REFRESH_TTL_DAYS: z.preprocess(optionalDefault, z.coerce.number().int().min(1).max(90).default(30)),
  JWT_REFRESH_COOKIE_NAME: z.preprocess(optionalString, z.string().min(1).default('metricast_refresh')),
  PASSWORD_RESET_TTL_MINUTES: z.preprocess(optionalDefault, z.coerce.number().int().min(5).max(120).default(30)),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // A forecast runtime is optional at API startup. Treat an intentionally blank
  // environment value the same as an omitted value so it is validated only when
  // a forecast is requested.
  FORECAST_PYTHON_PATH: z.preprocess(optionalString, z.string().min(1).optional()),
  FORECAST_SERVICE_MODE: z.preprocess(optionalString, z.enum(['local', 'remote']).default('local')),
  FORECAST_SERVICE_URL: z.preprocess(optionalString, z.string().min(1).optional()),
  FORECAST_SERVICE_TOKEN: z.preprocess(optionalString, z.string().min(1).optional()),
  FORECAST_SERVICE_TIMEOUT_MS: z.preprocess(optionalDefault, z.coerce.number().int().min(1_000).max(60_000).default(30_000)),
  // Vercel has one trusted proxy hop. Numeric trust avoids allowing a client to
  // forge arbitrary forwarded addresses and keeps rate limiting effective.
  TRUST_PROXY: z.preprocess(
    trustProxy,
    z.union([z.literal(false), z.number().int().min(1).max(3)]).default(false)
  )
});

export const env = environment.parse(process.env);
