CREATE TABLE "customer_feedback_imports" (
    "id" UUID NOT NULL,
    "sourceChecksum" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(6),
    "createdById" UUID,
    CONSTRAINT "customer_feedback_imports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_feedback_ratings" (
    "id" UUID NOT NULL,
    "feedbackDate" DATE NOT NULL,
    "overallSatisfaction" INTEGER NOT NULL,
    "foodSatisfaction" INTEGER NOT NULL,
    "serviceSatisfaction" INTEGER NOT NULL,
    "importId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "customer_feedback_ratings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_feedback_imports_sourceChecksum_key" ON "customer_feedback_imports"("sourceChecksum");
CREATE INDEX "customer_feedback_imports_status_startedAt_idx" ON "customer_feedback_imports"("status", "startedAt");
CREATE INDEX "customer_feedback_ratings_feedbackDate_idx" ON "customer_feedback_ratings"("feedbackDate");
CREATE INDEX "customer_feedback_ratings_importId_idx" ON "customer_feedback_ratings"("importId");

ALTER TABLE "customer_feedback_imports" ADD CONSTRAINT "customer_feedback_imports_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_feedback_ratings" ADD CONSTRAINT "customer_feedback_ratings_importId_fkey" FOREIGN KEY ("importId") REFERENCES "customer_feedback_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
