/*
  Warnings:

  - You are about to drop the column `lineMovementHistory` on the `bet_selections` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bet_selections" DROP COLUMN "lineMovementHistory";

-- AlterTable
ALTER TABLE "games" ADD COLUMN     "actualStartAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "current_odds" (
    "id" TEXT NOT NULL,
    "selectionId" TEXT NOT NULL,
    "currentOdds" DECIMAL(10,3) NOT NULL,
    "previousOdds" DECIMAL(10,3),
    "oddsMovement" VARCHAR(10),
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "externalOddsId" VARCHAR(255),
    "suspended" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "current_odds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odds_snapshots" (
    "id" TEXT NOT NULL,
    "selectionId" TEXT NOT NULL,
    "odds" DECIMAL(10,3) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" VARCHAR(20) NOT NULL DEFAULT 'api',
    "metadata" JSONB,

    CONSTRAINT "odds_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odds_sync_status" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextSyncAt" TIMESTAMP(3),
    "syncStatus" VARCHAR(20) NOT NULL DEFAULT 'active',
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "syncInterval" INTEGER NOT NULL DEFAULT 2000,

    CONSTRAINT "odds_sync_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odds_change_events" (
    "id" TEXT NOT NULL,
    "selectionId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "oldOdds" DECIMAL(10,3) NOT NULL,
    "newOdds" DECIMAL(10,3) NOT NULL,
    "changePercentage" DECIMAL(6,2) NOT NULL,
    "changeType" VARCHAR(20) NOT NULL,
    "broadcasted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odds_change_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "current_odds_selectionId_key" ON "current_odds"("selectionId");

-- CreateIndex
CREATE INDEX "current_odds_lastUpdatedAt_idx" ON "current_odds"("lastUpdatedAt");

-- CreateIndex
CREATE INDEX "current_odds_suspended_idx" ON "current_odds"("suspended");

-- CreateIndex
CREATE INDEX "odds_snapshots_selectionId_timestamp_idx" ON "odds_snapshots"("selectionId", "timestamp");

-- CreateIndex
CREATE INDEX "odds_snapshots_timestamp_idx" ON "odds_snapshots"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "odds_sync_status_gameId_key" ON "odds_sync_status"("gameId");

-- CreateIndex
CREATE INDEX "odds_sync_status_syncStatus_nextSyncAt_idx" ON "odds_sync_status"("syncStatus", "nextSyncAt");

-- CreateIndex
CREATE INDEX "odds_change_events_broadcasted_createdAt_idx" ON "odds_change_events"("broadcasted", "createdAt");

-- CreateIndex
CREATE INDEX "odds_change_events_gameId_createdAt_idx" ON "odds_change_events"("gameId", "createdAt");

-- CreateIndex
CREATE INDEX "odds_change_events_selectionId_createdAt_idx" ON "odds_change_events"("selectionId", "createdAt");

-- AddForeignKey
ALTER TABLE "current_odds" ADD CONSTRAINT "current_odds_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "bet_selections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odds_snapshots" ADD CONSTRAINT "odds_snapshots_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "bet_selections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "odds_sync_status" ADD CONSTRAINT "odds_sync_status_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
