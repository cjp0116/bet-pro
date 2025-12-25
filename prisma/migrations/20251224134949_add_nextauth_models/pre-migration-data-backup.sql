-- ============================================================================
-- PRE-MIGRATION DATA BACKUP SCRIPT
-- ============================================================================
-- This script preserves data before the schema migration that:
-- 1. Drops and recreates users.emailVerified (BOOLEAN -> TIMESTAMP(3))
-- 2. Drops the accounts table and creates financial_accounts
--
-- IMPORTANT: 
-- - Run this BEFORE applying the main migration
-- - Test on staging snapshot first
-- - Export database backup before production
-- - All operations are wrapped in transactions for safety
-- ============================================================================
BEGIN;
-- ============================================================================
-- STEP 1: Backup users.emailVerified
-- ============================================================================
-- Create temporary table to store emailVerified values
-- Convert BOOLEAN true -> CURRENT_TIMESTAMP, false -> NULL
CREATE TABLE IF NOT EXISTS users_emailverified_backup (
  user_id TEXT NOT NULL PRIMARY KEY,
  email_verified_timestamp TIMESTAMP(3),
  original_boolean BOOLEAN
);
-- Backup emailVerified: convert boolean to timestamp
-- true -> current timestamp (or user's createdAt if available)
-- false -> NULL
INSERT INTO users_emailverified_backup (
    user_id,
    email_verified_timestamp,
    original_boolean
  )
SELECT id,
  CASE
    WHEN "emailVerified" = true THEN COALESCE("createdAt", CURRENT_TIMESTAMP)
    ELSE NULL
  END,
  "emailVerified"
FROM users
WHERE "emailVerified" IS NOT NULL;
-- Log backup count
DO $$
DECLARE backup_count INTEGER;
BEGIN
SELECT COUNT(*) INTO backup_count
FROM users_emailverified_backup;
RAISE NOTICE 'Backed up emailVerified for % users',
backup_count;
END $$;
-- ============================================================================
-- STEP 2: Backup accounts table data
-- ============================================================================
-- Create temporary table with same structure as accounts
CREATE TABLE IF NOT EXISTS accounts_backup (
  id TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "accountType" VARCHAR(20) NOT NULL DEFAULT 'main',
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "availableBalance" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "lockedBalance" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  "lastTransactionAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
-- Copy all accounts data
INSERT INTO accounts_backup
SELECT id,
  "userId",
  "accountType",
  balance,
  "availableBalance",
  "lockedBalance",
  currency,
  "lastTransactionAt",
  "createdAt",
  "updatedAt"
FROM accounts;
-- Log backup count and verify data integrity
DO $$
DECLARE accounts_count INTEGER;
backup_count INTEGER;
total_balance DECIMAL(12, 2);
backup_total_balance DECIMAL(12, 2);
BEGIN
SELECT COUNT(*) INTO accounts_count
FROM accounts;
SELECT COUNT(*) INTO backup_count
FROM accounts_backup;
SELECT COALESCE(SUM(balance), 0) INTO total_balance
FROM accounts;
SELECT COALESCE(SUM(balance), 0) INTO backup_total_balance
FROM accounts_backup;
RAISE NOTICE 'Backed up % accounts (original: %)',
backup_count,
accounts_count;
RAISE NOTICE 'Total balance: % (backup: %)',
total_balance,
backup_total_balance;
-- Verify counts match
IF accounts_count != backup_count THEN RAISE EXCEPTION 'Account count mismatch: original=%, backup=%',
accounts_count,
backup_count;
END IF;
-- Verify balance matches (within rounding tolerance)
IF ABS(total_balance - backup_total_balance) > 0.01 THEN RAISE EXCEPTION 'Balance mismatch: original=%, backup=%',
total_balance,
backup_total_balance;
END IF;
END $$;
-- ============================================================================
-- STEP 3: Verify foreign key relationships
-- ============================================================================
-- Check that all account userIds reference valid users
DO $$
DECLARE orphaned_accounts INTEGER;
BEGIN
SELECT COUNT(*) INTO orphaned_accounts
FROM accounts_backup ab
WHERE NOT EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = ab."userId"
  );
IF orphaned_accounts > 0 THEN RAISE WARNING 'Found % orphaned accounts (userId does not exist in users)',
orphaned_accounts;
END IF;
END $$;
-- Check that all transaction accountIds reference valid accounts
DO $$
DECLARE orphaned_transactions INTEGER;
BEGIN
SELECT COUNT(*) INTO orphaned_transactions
FROM transactions t
WHERE NOT EXISTS (
    SELECT 1
    FROM accounts_backup ab
    WHERE ab.id = t."accountId"
  );
IF orphaned_transactions > 0 THEN RAISE WARNING 'Found % transactions referencing non-existent accounts',
orphaned_transactions;
END IF;
END $$;
COMMIT;
-- ============================================================================
-- VERIFICATION QUERIES (run these manually to verify before proceeding)
-- ============================================================================
-- SELECT COUNT(*) as email_verified_backups FROM users_emailverified_backup;
-- SELECT COUNT(*) as accounts_backups FROM accounts_backup;
-- SELECT COUNT(*) as original_accounts FROM accounts;
-- SELECT COUNT(*) as original_users_with_email_verified FROM users WHERE "emailVerified" IS NOT NULL;