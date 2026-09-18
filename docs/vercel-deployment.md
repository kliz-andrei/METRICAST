# Vercel deployment

METRICAST uses two Vercel projects from the same repository: set the frontend project's Root Directory to `frontend` and the backend project's Root Directory to `backend`.

## Frontend

Vercel detects Vite and runs `npm run build`. Set this public build-time variable:

```text
VITE_API_BASE_URL=https://<backend-domain>/api/v1
```

`frontend/vercel.json` returns `index.html` for browser routes, so direct visits to application routes work. API calls are not rewritten because Axios uses the absolute API base URL.

## Backend

The existing `npm run build` remains the backend build. `postinstall` runs `prisma generate --schema ../database/prisma/schema.prisma`; it only generates the client and never migrates or alters data. `backend/api/index.ts` is a thin Vercel function adapter around the existing Express app.

Set these backend-only variables:

```text
NODE_ENV=production
DATABASE_URL=<PostgreSQL connection string>
JWT_ACCESS_SECRET=<at least 32 random characters>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL_DAYS=30
JWT_REFRESH_COOKIE_NAME=metricast_refresh
PASSWORD_RESET_TTL_MINUTES=30
CORS_ORIGIN=https://<frontend-domain>
TRUST_PROXY=true
FORECAST_PYTHON_PATH=<only for a separately hosted compatible runtime>
```

`CORS_ORIGIN` accepts a comma-separated frontend allow-list. Never use `*`: credentialed requests are required. In production the refresh cookie is `HttpOnly`, `Secure`, and `SameSite=None`; locally it remains `SameSite=Strict` for HTTP development.

## PostgreSQL and Prisma

Provision PostgreSQL separately. Run migrations only from a controlled environment:

```powershell
npm.cmd --prefix backend run db:migrate
```

Do not use `prisma migrate reset` in production. Deployments do not run migrations, seeds, imports, or destructive commands.

## SARIMA forecasting limitation

The current forecast endpoint starts `forecast-service/sarima_forecast.py` through a local Python environment. A Vercel Node function cannot safely package or execute that project-local Python runtime, and serverless execution is not an appropriate host for the existing SARIMA process.

Local forecasting remains unchanged. Production SARIMA requires a separately deployed Python-capable service or container, followed by an explicit future integration to call it. Do not set `FORECAST_PYTHON_PATH` to a local Windows path on Vercel; until that runtime exists, the API correctly reports the SARIMA runtime as unavailable instead of inventing forecasts.
