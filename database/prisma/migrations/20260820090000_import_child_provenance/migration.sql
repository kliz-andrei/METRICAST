-- Preserve import provenance for new transaction-item and payment rows so a batch can be deleted safely.
ALTER TABLE "transaction_items" ADD COLUMN "importBatchId" UUID;
ALTER TABLE "payments" ADD COLUMN "importBatchId" UUID;

CREATE INDEX "transaction_items_importBatchId_idx" ON "transaction_items"("importBatchId");
CREATE INDEX "payments_importBatchId_idx" ON "payments"("importBatchId");

ALTER TABLE "transaction_items"
  ADD CONSTRAINT "transaction_items_importBatchId_fkey"
  FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_importBatchId_fkey"
  FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
