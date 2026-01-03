/*
  Warnings:

  - Added the required column `bookmaker` to the `odds_audit_log` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "odds_audit_log" ADD COLUMN     "bookmaker" VARCHAR(50) NOT NULL;

-- CreateIndex
CREATE INDEX "odds_audit_log_bookmaker_createdAt_idx" ON "odds_audit_log"("bookmaker", "createdAt");
