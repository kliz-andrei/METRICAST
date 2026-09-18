import 'dotenv/config';
import { z } from 'zod';

const environment = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  JWT_REFRESH_COOKIE_NAME: z.string().min(1).default('metricast_refresh'),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(120).default(30),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // A forecast runtime is optional at API startup. Treat an intentionally blank
  // environment value the same as an omitted value so it is validated only when
  // a forecast is requested.
  FORECAST_PYTHON_PATH: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().min(1).optional()
  ),
  TRUST_PROXY: z.coerce.boolean().default(false)
});

export const env = environment.parse(process.env);
