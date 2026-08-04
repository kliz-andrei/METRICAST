# Under the Balete POS import mapping

All source files are a single import batch. Currency is normalized from the Philippine-peso formatted source values into `DECIMAL(14,2)`; dates are interpreted as Manila time from `DD/MM/YYYY` and `HH:mm:ss`.

| POS source | Target | Duplicate key |
| --- | --- | --- |
| `Transactions.TransactionID` | `transactions.sourceTransactionId` | Unique source transaction ID |
| `Transactions.InvoiceNo` | `transactions.invoiceNo` | Unique invoice number |
| `ProductSales` row | `transaction_items` | Transaction ID + original source row |
| `ProductSales.Category` | `categories` | Normalized category source key |
| `ProductSales.Category + ProductName` | `products` | Normalized product source key |
| `Payments` row | `payments` | Transaction ID + original source row |

An SHA-256 checksum across all three raw files prevents the same completed export from being imported twice. New source rows are only committed after all validation succeeds; a transaction failure rolls the entire batch back. Invalid rows are retained in `import_errors` against the failed `import_batches` record.
