# Architecture decisions

## Service boundaries

The React client consumes a versioned Express REST API. Express owns validation, authorization, reporting orchestration, and PostgreSQL access through Prisma. The forecasting service is isolated behind REST so its statistical models and Python dependencies can evolve without coupling the client or core API to model implementation details.

## POS data boundary

The importer receives `Transactions.csv`, `ProductSales.csv`, and `Payments.csv` as one logical import batch. It validates headers and row values, normalizes PHP currency and `DD/MM/YYYY` dates, retains source transaction IDs, and records an import ledger. This makes repeat imports traceable and prevents accidental duplication.

## Analytics boundary

Dashboard and analytics endpoints accept one common filter contract. Metric calculation services share filtered transaction scopes, ensuring KPIs, charts, rankings, and export tables agree for a selected date range and other filters.
