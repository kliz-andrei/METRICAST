-- Add nullable reference costing to products. Existing POS records and products
-- are intentionally left unchanged until an administrator configures real costs.
ALTER TABLE "products" ADD COLUMN "unitCost" DECIMAL(14, 2);

-- A single, application-owned financial settings row stores the configurable
-- operating-overhead assumption used by future financial projections.
CREATE TABLE "financial_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "overheadRate" DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "financial_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "financial_settings_singleton_check" CHECK ("id" = 'default'),
  CONSTRAINT "financial_settings_overhead_rate_check" CHECK ("overheadRate" >= 0 AND "overheadRate" <= 100)
);

INSERT INTO "financial_settings" ("id", "overheadRate")
VALUES ('default', 10.00);
