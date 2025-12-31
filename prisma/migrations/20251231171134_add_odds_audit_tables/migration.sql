-- CreateTable
CREATE TABLE "api_odds_snapshots" (
    "id" TEXT NOT NULL,
    "externalGameId" VARCHAR(100) NOT NULL,
    "sportKey" VARCHAR(50) NOT NULL,
    "homeTeam" VARCHAR(100) NOT NULL,
    "awayTeam" VARCHAR(100) NOT NULL,
    "commenceTime" TIMESTAMP(3) NOT NULL,
    "bookmaker" VARCHAR(50) NOT NULL,
    "rawData" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_odds_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odds_audit_log" (
    "id" TEXT NOT NULL,
    "externalGameId" VARCHAR(100) NOT NULL,
    "sportKey" VARCHAR(50) NOT NULL,
    "marketKey" VARCHAR(20) NOT NULL,
    "selectionName" VARCHAR(200) NOT NULL,
    "oldOdds" DECIMAL(10,3) NOT NULL,
    "newOdds" DECIMAL(10,3) NOT NULL,
    "changePercent" DECIMAL(6,2) NOT NULL,
    "changeType" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odds_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_odds_snapshots_sportKey_timestamp_idx" ON "api_odds_snapshots"("sportKey", "timestamp");

-- CreateIndex
CREATE INDEX "api_odds_snapshots_externalGameId_idx" ON "api_odds_snapshots"("externalGameId");

-- CreateIndex
CREATE INDEX "api_odds_snapshots_timestamp_idx" ON "api_odds_snapshots"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "api_odds_snapshots_externalGameId_timestamp_key" ON "api_odds_snapshots"("externalGameId", "timestamp");

-- CreateIndex
CREATE INDEX "odds_audit_log_externalGameId_createdAt_idx" ON "odds_audit_log"("externalGameId", "createdAt");

-- CreateIndex
CREATE INDEX "odds_audit_log_changeType_createdAt_idx" ON "odds_audit_log"("changeType", "createdAt");

-- CreateIndex
CREATE INDEX "odds_audit_log_sportKey_createdAt_idx" ON "odds_audit_log"("sportKey", "createdAt");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");

-- CreateIndex
CREATE INDEX "auth_sessions_sessionToken_idx" ON "auth_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "oauth_accounts_userId_idx" ON "oauth_accounts"("userId");
