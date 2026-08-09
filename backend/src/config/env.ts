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
  FORECAST_PYTHON_PATH: z.string().min(1).optional(),
  TRUST_PROXY: z.coerce.boolean().default(false)
});

export const env = environment.parse(process.env);
