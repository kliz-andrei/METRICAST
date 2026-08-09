# METRICAST metric definitions

This reference records the definitions traced from the current Prisma schema and services. Values are filtered by `Transaction.deletedAt = null`, the selected `occurredAt` range, and selected sales channels where supported.

| Metric | Definition / formula | Source | Display | Audit status |
| --- | --- | --- | --- | --- |
| Gross Sales | `SUM(Transaction.grossSales)` | Sales Analytics summary | PHP, 2 decimals | Verified |
| Net Sales | `SUM(Transaction.netSales)` | Sales Analytics and Dashboard summaries | PHP, 2 decimals | Verified |
| Discounts | `SUM(Transaction.discountAmount)` | Sales Analytics summary | PHP, 2 decimals | Verified |
| Service Charge | `SUM(Transaction.serviceCharge)` | Sales Analytics summary | PHP, 2 decimals | Verified |
| Transactions | Count of non-deleted transactions | Sales Analytics / Dashboard summaries | Whole number | Verified |
| Average Order Value | `AVG(Transaction.netSales)` | Sales Analytics summary | PHP, 2 decimals | Verified |
| Average Daily Sales | Net Sales divided by selected calendar days; for All data the UI currently uses the number of returned daily buckets | Dashboard UI + Sales daily endpoint | PHP, 2 decimals | Needs source-definition confirmation for All data |
| Average Sales per Hour | `SUM(Transaction.netSales) ÷ total operating hours` | Dashboard UI + Sales Analytics summary | PHP, 2 decimals | Verified operating schedule; partial-import handling limitation documented below |
| Guests Served | Dashboard currently uses `AVG(guestCount) × transactionCount`, rounded | Dashboard summary + UI | Whole number | Needs correction: authoritative definition should be `SUM(guestCount)` |
| Revenue per Guest | Net Sales divided by the current Guests Served value; omitted when zero | Dashboard UI | PHP, 2 decimals | Formula verified; inherits Guests Served limitation |
| Discount Rate | `SUM(discountAmount) ÷ SUM(grossSales) × 100` | Sales Analytics summary + Dashboard UI | Percentage | Verified; safely unavailable when gross sales is zero |
| Sales Channel | `Transaction.salesChannel`; grouped by Net Sales and count | Dashboard / Sales Analytics | Text + PHP | Semantics need source verification: the imported values include `GCash`, which may be a payment method rather than a channel |
| Order Type | `Transaction.orderType`; grouped by Net Sales and count | Sales Analytics | Text + PHP | Verified as stored POS dimension; source semantics remain POS-defined |
| Payment Method | `Payment.paymentMethod`, distinct from `Transaction.salesChannel` | Operational repository | Text + PHP | Verified as separate model field |
| Product Revenue | `SUM(TransactionItem.salesAmount)` | Product Analytics and Dashboard product rank | PHP, 2 decimals | Verified |
| Product Contribution | Product revenue divided by Dashboard Net Sales | Dashboard UI | Percentage | Needs label confirmation: numerator is item sales amount while denominator is transaction Net Sales |
| Top / Lowest Sales Days | Daily `SUM(Transaction.netSales)`, sorted descending / ascending | Sales daily endpoint + Dashboard UI | PHP, 2 decimals | Verified |

## Financial relationship

The schema stores `grossSales`, `discountAmount`, `serviceCharge`, `amountDue`, and `netSales` as separate imported POS fields. The current application sums and displays those imported fields independently. No service currently derives Net Sales from the other fields, so the exact financial relationship—particularly the placement of service charge—**needs POS source verification** and must not be inferred from the column names alone.

## June 30, 2026

The Dashboard preserves the low June 30 value because daily sales are directly grouped from imported `occurredAt` and `netSales` records. The low value requires a source-data completeness audit (for example, transaction count and import coverage for that date) before it can be characterized as a partial day, a parsing issue, or actual low sales. It must not be smoothed or excluded.

## Average Sales per Hour

Average Sales per Hour means the average **Net Sales** generated per verified Under the Balete operating hour. The verified operating schedule is **10:00 AM–12:00 AM**, or **14 hours per operating day**.

`Average Sales per Hour = SUM(netSales) ÷ (applicable operating days × 14)`

For bounded Dashboard date ranges, every calendar date in the inclusive selected range contributes 14 hours. Sales-channel filters affect only the Net Sales numerator; they do not change the restaurant's operating-hours denominator. For the unbounded **All** range, the Dashboard counts only unique dates represented by the imported, unfiltered daily-sales dataset, so it does not invent dates outside the import scope.

The application has no reliable per-day import-completeness indicator yet. Therefore, it cannot automatically identify a partially imported date and reduce its denominator; a known partial day should be assessed through the existing data-quality audit before interpreting this KPI.

For a bounded previous-period comparison, both the current and preceding period use the same Net Sales ÷ (inclusive calendar days × 14) methodology. A comparison is omitted when the prior period has no sales value or the Dashboard is in unbounded All mode.

## Previous-period comparison

When both start and end dates are selected, the Dashboard calculates an equivalent immediately preceding calendar period. Percentage change is `(current - previous) / previous × 100`; a zero or missing previous value omits the comparison. All-data mode has no bounded equivalent period, so comparisons are omitted. Current comparisons use the same selected sales channels as the current period. Gross Sales, Average Daily Sales, Discount Rate, and Average Sales per Hour are calculated from matching current/previous Sales Analytics summaries. Guests Served and Revenue per Guest comparisons remain omitted pending an authoritative guest sum.
