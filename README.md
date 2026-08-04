# METRICAST

METRICAST (Metric Analytics and Forecasting System) is a business-intelligence web application for Under the Balete Restaurant. It will ingest POS exports and provide role-aware sales, customer, product, operational, reporting, and forecasting views.

## Project structure

| Directory | Responsibility |
| --- | --- |
| `frontend/` | React and Vite web client |
| `backend/` | Express REST API and Prisma data access |
| `forecast-service/` | FastAPI statistical forecasting service |
| `database/` | Prisma schema, migrations, seeds, and import mapping |
| `datasets/` | Source POS CSV samples; never imported automatically |
| `docs/` | Architecture, API, and deployment documentation |

## POS source files

The source exports are retained in `datasets/` and establish the import contract for subsequent phases:

- `Transactions.csv`: sale-level fields, including invoice, day-first date, time, order context, gross sales, service charge, discounts, amount due, and net sales.
- `ProductSales.csv`: transaction line items, including product, category, quantity, unit price, and sales amount.
- `Payments.csv`: payment allocation, method, provider, and amount.

Amounts are PHP-formatted strings in the extracts, and transaction dates use `DD/MM/YYYY`. The import pipeline will parse these explicitly and preserve source identifiers for repeatable imports.

## Development conventions

- TypeScript is the target language for all new application code.
- Business calculations belong in backend/domain services, not React components.
- API responses are versioned under `/api/v1` once the backend is introduced.
- Database changes are migration-led and maintain source-to-database mapping documentation.
- Secrets belong only in local environment files; commit an `.env.example` whenever a new service needs configuration.

## Phased delivery

1. Project initialization — completed
2. POS-aligned database schema and import contract
3. Express API foundation
4. Authentication and role-based access
5. Frontend layout and routing
6. Dashboard KPIs and filters
7. Analytics modules and exportable tables
8. Forecasting service and accuracy metrics
9. Reports and document exports
10. Deployment, Docker, and operational documentation
