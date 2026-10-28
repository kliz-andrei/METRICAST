# METRICAST Defense Cheat Sheet

## 30-second introduction

“We developed METRICAST, a web-based KPI dashboard with predictive forecasting for Under the Balete Restaurant. It imports and validates POS CSV exports, stores related transactions, product sales, and payments in PostgreSQL, and presents sales, customer, product, operational, forecast, report, and financial-planning insights. It is a decision-support system: it organizes historical information and produces estimates, but it does not claim to guarantee future sales or prove business improvement.”

## One-minute technical explanation

“The frontend is React with Vite and Tailwind CSS. It calls an Express TypeScript REST API using authenticated JSON requests. The backend validates requests, enforces roles, queries PostgreSQL through Prisma, and sends daily historical series to a protected Python FastAPI forecasting service. Net Sales currently uses Holt-Winters with weekly seasonality; SARIMA is implemented for transaction volume, guest count, and selected-product demand. Generated Net Sales forecasts can be saved with metadata and used by reports and estimated financial projections.”

## Architecture in plain language

| Layer | Simple explanation |
|---|---|
| Frontend | The screens users see and interact with. |
| Backend/API | The protected middle layer that receives requests, checks access, applies rules, and returns results. |
| Database | The long-term structured storage for users, imports, transactions, items, payments, feedback, forecasts, and audit records. |
| Forecast service | A Python service that calculates statistical forecasts from historical daily values. |

## Stack

| Area | Confirmed technology |
|---|---|
| Frontend | TypeScript, React 19, Vite 8, Tailwind CSS 4, TanStack Query, Axios, Recharts |
| Backend | TypeScript, Express 5, Zod, Prisma |
| Database | PostgreSQL |
| Forecasting | Python, FastAPI, NumPy, pandas, statsmodels |
| Tests | Vitest and Supertest in backend |
| Security | bcrypt password hashes, JWTs, RBAC, Helmet, CORS config, rate limit, validation, audit logs |

## Forecast model

| Target | Current model | Configuration |
|---|---|---|
| Net Sales | Holt-Winters weekly | additive trend, damped trend, additive seasonal component, period 7 |
| Transaction Volume | SARIMA | `(1,1,1) x (1,0,1,7)` |
| Guest Count | SARIMA | `(1,1,1) x (1,0,1,7)` |
| Selected Product Demand | SARIMA | `(1,1,1) x (1,0,1,7)` |

## Key KPI formulas

| KPI | Formula / source |
|---|---|
| Total Sales | Sum of filtered `grossSales` |
| Net Sales | Sum of filtered `netSales` |
| Average Daily Sales | Net Sales ÷ inclusive calendar days selected |
| Average Sales/Transaction | Net Sales ÷ selected transactions |
| Guest Count | Sum of positive recorded guest counts for guest-based analytics |
| Customer peak hour | Local Manila hour with highest recorded eligible guests |
| Operational peak hour | Local Manila hour with highest transaction count |
| Estimated product cost | Forecast Net Sales × historical configured-cost ratio |
| Estimated overhead | Estimated product cost × configured overhead rate |
| Estimated profit | Forecast Net Sales − estimated total cost |

## Forecast evaluation

- **Chronological:** train on earlier dates; validate on later held-out dates.
- **MAPE:** relative percentage error; excludes zero actuals.
- **RMSE:** peso/unit error magnitude; penalizes large errors more.
- **Do not quote an accuracy score** unless you have the preserved output, validation dates, model, and observation count.

## Five limitations to say honestly

1. CSV import is not direct live POS integration.
2. Forecast quality depends on historical-data quality and assumptions, including weekly seasonality and zero-filled missing dates.
3. Forecasts do not use external variables such as promotions, weather, holidays, or events.
4. Financial projections are estimates, not audited accounting results.
5. The system supports decisions; it does not prove causal operational or financial improvement without outcome research.

## Ten difficult questions — short answers

1. **Is this AI?** — It is predictive analytics using statistical time-series models, not deep learning.
2. **Why not Power BI?** — We needed controlled import, roles, database persistence, and forecasting integration in a custom web application.
3. **Why weekly seasonality?** — Restaurant performance can repeat by day of week; it is a model assumption that must be validated.
4. **What happens with zero actual sales in MAPE?** — That point is excluded to avoid division by zero.
5. **Does high accuracy prove usefulness?** — No; forecast error, usability, and business impact are separate evaluations.
6. **Are profits actual?** — No; they are estimated from configured costs and overhead assumptions.
7. **How do you stop duplicate imports?** — File checksum validation, duplicate transaction-ID checks, and database uniqueness rules.
8. **How do you secure access?** — Password hashing, JWT authentication, role checks, input validation, and server middleware.
9. **Can a chart query the database directly?** — No; it requests data through the protected backend API.
10. **What if you do not know a fact?** — State the confirmed part, do not guess, and identify the artifact needed to verify it.

## Claims we must not make without evidence

- “The system uses SARIMA for Net Sales.”
- Any fixed MAPE/RMSE value without the matching preserved validation run.
- “METRICAST improved sales, staffing, waste, or operational efficiency.”
- “The system has verified backups, uptime, monitoring, or penetration testing.”
- “Power BI is the implementation platform.”
- Any survey count, ISO score, dataset total, or deployment claim not supported by its raw artifact.

## If I do not know the answer

Say: “I do not want to guess. The confirmed implementation is ____. To verify the remaining point, I would check ____.” Then point to a route, test, import record, configuration file, or evaluation artifact. This is professional, technically accurate, and safer than inventing an answer.
