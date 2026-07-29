-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_userEmail_idx" ON "AuditLog"("userEmail");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
