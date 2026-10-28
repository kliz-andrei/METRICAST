# METRICAST Manuscript Alignment Audit

**Scope:** Read-only comparison of the available manuscript audit evidence and current repository. This document does not amend the thesis. “Missing evidence” means source code alone cannot validate the research result.

| Manuscript claim/location | Actual implementation/evidence | Issue | Recommended manuscript change | Priority |
|---|---|---|---|---|
| Ch. 1 ¶137/162; Ch. 3 ¶321–334; Ch. 4 ¶475/490/502: SARIMA is the Net Sales model | `modelForTarget` routes `net_sales` to `HOLT_WINTERS_WEEKLY`; Python service uses additive, damped Holt-Winters with weekly seasonality. `backend/src/services/forecasting.service.ts`; `forecast-service/sarima_forecast.py` | **Outdated** | “Net Sales forecasting uses Holt-Winters weekly seasonality. SARIMA remains implemented for transaction-volume, guest-count, and selected-product-demand targets.” | Critical |
| Ch. 2 Power BI wording suggests it creates METRICAST | Repository is a React/Vite + Express/Prisma/FastAPI web app; no Power BI artifact found. | **Unsupported by implementation** | “Power BI is discussed as related BI literature; METRICAST is a custom web application.” | Critical |
| Ch. 3 Table 3.1 versus ¶265; Ch. 4 Table 4.2/¶511 respondent categories | Text says 10 owners/managers, 13 users, 13 IT; the extracted table had a conflicting category allocation. | **Requires researcher confirmation** | Recompute each count/percentage from signed questionnaires/raw responses and use one consistent table. | Critical |
| Ch. 3 ¶294; Ch. 4 ¶505; Ch. 5 ¶558 alternate four characteristics | Other manuscript sections/results include Security, and current system has security controls. | **Wording needs clarification** | Use one approved scope consistently: Functional Suitability, Performance Efficiency, Usability, Reliability, and Security. | Critical |
| Ch. 4 ¶496–503 reports SARIMA MAPE 5.22% and RMSE ₱8,002 | Code computes MAPE/RMSE but values depend on live data, selected validation range, and model. No reproducible result artifact was available. | **Missing evidence** | Re-run and preserve a chronological validation output identifying data cutoff, model, train/holdout dates, observations, MAPE, and RMSE. | Critical |
| Ch. 4 dataset/import totals and “no errors” claims | Import validation is implemented, but source batch exports/database outputs were not audited here. | **Missing evidence** | Cite Import History, batch-detail export, and database query/validation record for every reported count. | High |
| Ch. 4 peak/off-peak narrative | Customer hourly component is guest-based; operational hourly component is transaction-based. | **Wording needs clarification** | Name the measured unit: “peak guest activity” or “peak transaction volume.” | High |
| Ch. 3 ¶295 correlation analysis | No correlation-analysis module or reproducible analysis was found. | **Unsupported by implementation** | Remove it, or state the method, variables, output, and limitations with supporting artifact. | Medium |
| Ch. 3 ¶352 calls ISO evaluation Specific Objective 5 | Later chapter identifies ISO evaluation as SOO6. | **Outdated** | Change “Specific Objective 5” to the approved objective number after final objective reconciliation. | Medium |
| KPI descriptions describe average sales per transaction imprecisely | Operational code uses total selected Net Sales ÷ total selected transactions. | **Confirmed aligned after wording correction** | “Average Sales per Transaction = total Net Sales ÷ total completed/qualifying transactions for the selected scope.” | Medium |
| Ch. 4 only names dine-in/takeout in operational distribution | Current records/charts support broader order-type and sales-channel distributions. | **Wording needs clarification** | Refer to “available order types/sales channels,” and name categories only when demonstrated from the dataset. | Medium |
| Financial projections may read as actual profit | Service is explicitly an estimate based on forecast, cost ratio, configured unit costs, and overhead. | **Confirmed aligned after wording correction** | Add “estimated planning projection; not audited financial profit.” | High |
| Ch. 5 says four characteristics, then separately Security | Results elsewhere list five characteristics. | **Outdated** | Harmonize Chapter 5 with the approved five-characteristic instrument and final tables. | Critical |
| Deployment, backups, uptime, monitoring claims | Vercel configuration/environment support exists; active production infrastructure and backup/monitoring evidence were not audited. | **Missing evidence** | Limit wording to implemented deployment configuration, or attach verified deployment/operational records. | High |

## Confirmed aligned claims

| Claim | Evidence | Classification |
|---|---|---|
| METRICAST is a web-based KPI and forecasting system | `frontend/src/main.tsx`, `backend/src/app.ts` | Confirmed aligned |
| POS CSV import validates fields, relationships, duplicate IDs, and source checksum | `backend/src/database/pos-validation.ts`, `backend/src/database/pos-import.service.ts` | Confirmed aligned |
| Customer feedback is separate from POS data | `CustomerFeedbackImport` and `CustomerFeedbackRating` in `database/prisma/schema.prisma` | Confirmed aligned |
| Date-aware analytics use Philippine timezone handling | `backend/src/repositories/customer-analytics.repository.ts`, `backend/src/repositories/operational.repository.ts` | Confirmed aligned |
| Financial projections use configured unit costs and overhead | `backend/src/services/financial-projection.service.ts` | Confirmed aligned |
| Authenticated, role-aware access is implemented | `backend/src/middleware/auth.ts`, `backend/src/routes/api.ts` | Confirmed aligned |

## Evidence still needed before defense

1. Final deployed version and URL, plus production environment ownership/configuration record.
2. Exported validation result for the exact forecast model/date range cited in the thesis.
3. Import-batch evidence for all reported record totals and zero-error claims.
4. Raw ISO questionnaire, participant counts/categories, scoring worksheet, and final weighted means.
5. Evidence for any uptime, backup, security-test, performance benchmark, or operational-improvement statement.
6. External verification of manuscript references, DOI/URL accuracy, and citation-to-claim relevance.

## Suggested approved wording for model and projections

> METRICAST prepares daily historical series from validated POS records. The current Net Sales forecast uses Holt-Winters exponential smoothing with weekly seasonality. Separate SARIMA capability remains available for transaction volume, guest count, and selected-product-demand targets. Forecast and financial-projection outputs are decision-support estimates; they are not guaranteed future results or audited financial statements.
