-- Backfill provenance only for the verified legacy import batch.
--
-- The guards below establish ownership from the child -> transaction foreign
-- key and the transaction -> ImportBatch relationship. They also require the
-- exact persisted import counts to match, so this migration aborts rather than
-- attributing rows if the dataset has changed since the investigation.
DO $$
DECLARE
  verified_batch_id UUID := '7e4c54b5-d499-4655-8466-92e136ff10ab';
  batch_status "ImportStatus";
  expected_transactions INTEGER;
  expected_items INTEGER;
  expected_payments INTEGER;
  owned_transactions INTEGER;
  linked_items INTEGER;
  unassigned_items INTEGER;
  linked_payments INTEGER;
  unassigned_payments INTEGER;
  assigned_items INTEGER;
  assigned_payments INTEGER;
BEGIN
  SELECT
    "status",
    "importedTransactions",
    "importedItems",
    "importedPayments"
  INTO
    batch_status,
    expected_transactions,
    expected_items,
    expected_payments
  FROM "import_batches"
  WHERE "id" = verified_batch_id;

  IF NOT FOUND OR batch_status <> 'COMPLETED' THEN
    RAISE EXCEPTION 'Verified legacy ImportBatch % is missing or not completed.', verified_batch_id;
  END IF;

  SELECT COUNT(*) INTO owned_transactions
  FROM "transactions"
  WHERE "importBatchId" = verified_batch_id;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE item."importBatchId" IS NULL)
  INTO linked_items, unassigned_items
  FROM "transaction_items" AS item
  INNER JOIN "transactions" AS transaction
    ON transaction."id" = item."transactionId"
  WHERE transaction."importBatchId" = verified_batch_id;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE payment."importBatchId" IS NULL)
  INTO linked_payments, unassigned_payments
  FROM "payments" AS payment
  INNER JOIN "transactions" AS transaction
    ON transaction."id" = payment."transactionId"
  WHERE transaction."importBatchId" = verified_batch_id;

  IF owned_transactions <> expected_transactions
    OR linked_items <> expected_items
    OR unassigned_items <> expected_items
    OR linked_payments <> expected_payments
    OR unassigned_payments <> expected_payments THEN
    RAISE EXCEPTION
      'Legacy provenance checks failed for ImportBatch %. No records were updated.',
      verified_batch_id;
  END IF;

  UPDATE "transaction_items" AS item
  SET "importBatchId" = verified_batch_id
  FROM "transactions" AS transaction
  WHERE item."transactionId" = transaction."id"
    AND transaction."importBatchId" = verified_batch_id
    AND item."importBatchId" IS NULL;
  GET DIAGNOSTICS assigned_items = ROW_COUNT;

  UPDATE "payments" AS payment
  SET "importBatchId" = verified_batch_id
  FROM "transactions" AS transaction
  WHERE payment."transactionId" = transaction."id"
    AND transaction."importBatchId" = verified_batch_id
    AND payment."importBatchId" IS NULL;
  GET DIAGNOSTICS assigned_payments = ROW_COUNT;

  IF assigned_items <> expected_items OR assigned_payments <> expected_payments THEN
    RAISE EXCEPTION
      'Legacy provenance assignment counts did not match ImportBatch %. Transaction rolled back.',
      verified_batch_id;
  END IF;

  INSERT INTO "audit_logs" (
    "action",
    "entityType",
    "entityId",
    "metadata"
  ) VALUES (
    'MIGRATE_LEGACY_IMPORT_PROVENANCE',
    'ImportBatch',
    verified_batch_id::TEXT,
    jsonb_build_object(
      'migration', '20260821000000_backfill_verified_legacy_import_provenance',
      'transactionItemsAssigned', assigned_items,
      'paymentsAssigned', assigned_payments,
      'basis', 'child foreign keys resolve only to transactions attributed to this batch; persisted import counts matched exactly'
    )
  );
END $$;
