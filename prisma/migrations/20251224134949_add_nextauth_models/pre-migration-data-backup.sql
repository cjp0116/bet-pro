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
--
-- WORKFLOW:
-- 1. Run this script (pre-migration-data-backup.sql)
-- 2. Apply main migration (npx prisma migrate deploy)
-- 3. Run restore script (post-migration-data-restore.sql)
-- 4. Verify data integrity
-- 5. Run cleanup script (post-migration-cleanup.sql)
-- ============================================================================
BEGIN;
-- ============================================================================
-- STEP 0: Create migration_backups metadata/audit table
-- ============================================================================
-- This table provides an audit trail for all backup operations
CREATE TABLE IF NOT EXISTS migration_backups (
  id SERIAL PRIMARY KEY,
  migration_name TEXT NOT NULL,
  source_table TEXT NOT NULL,
  backup_table TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  checksum_value TEXT,
  -- MD5 hash of key columns for verification
  total_balance DECIMAL(12, 2),
  -- For financial tables
  backup_timestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  restore_timestamp TIMESTAMP(3),
  cleanup_timestamp TIMESTAMP(3),
  operator TEXT DEFAULT CURRENT_USER,
  status TEXT NOT NULL DEFAULT 'backup_created',
  -- backup_created, restored, verified, cleaned_up, failed
  notes TEXT
);
-- Record that backup is starting
INSERT INTO migration_backups (
    migration_name,
    source_table,
    backup_table,
    row_count,
    status,
    notes
  )
VALUES (
    '20251224134949_add_nextauth_models',
    'migration_backups',
    'migration_backups',
    0,
    'in_progress',
    'Migration backup started'
  );
-- ============================================================================
-- STEP 1: Backup users.emailVerified
-- ============================================================================
-- Create backup table to store emailVerified values
-- Convert BOOLEAN true -> CURRENT_TIMESTAMP, false -> NULL
CREATE TABLE IF NOT EXISTS users_emailverified_backup (
  user_id TEXT NOT NULL PRIMARY KEY,
  email_verified_timestamp TIMESTAMP(3),
  original_boolean BOOLEAN,
  backup_timestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Clear any previous backup data (idempotency)
DELETE FROM users_emailverified_backup;
-- Backup emailVerified: convert boolean to timestamp
-- true -> current timestamp (or user's createdAt if available)
-- false -> NULL
INSERT INTO users_emailverified_backup (
    user_id,
    email_verified_timestamp,
    original_boolean,
    backup_timestamp
  )
SELECT id,
  CASE
    WHEN "emailVerified" = true THEN COALESCE("createdAt", CURRENT_TIMESTAMP)
    ELSE NULL
  END,
  "emailVerified",
  CURRENT_TIMESTAMP
FROM users
WHERE "emailVerified" IS NOT NULL;
-- Log backup count and record in audit table
DO $$
DECLARE backup_count INTEGER;
checksum TEXT;
BEGIN
SELECT COUNT(*) INTO backup_count
FROM users_emailverified_backup;
-- Generate checksum from user_ids for verification
SELECT MD5(
    STRING_AGG(
      user_id,
      ','
      ORDER BY user_id
    )
  ) INTO checksum
FROM users_emailverified_backup;
-- Record in audit table
INSERT INTO migration_backups (
    migration_name,
    source_table,
    backup_table,
    row_count,
    checksum_value,
    status
  )
VALUES (
    '20251224134949_add_nextauth_models',
    'users',
    'users_emailverified_backup',
    backup_count,
    checksum,
    'backup_created'
  );
RAISE NOTICE 'Backed up emailVerified for % users (checksum: %)',
backup_count,
checksum;
END $$;
-- ============================================================================
-- STEP 2: Backup accounts table data
-- ============================================================================
-- Create backup table with same structure as accounts
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  backup_timestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Clear any previous backup data (idempotency)
DELETE FROM accounts_backup;
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
  "updatedAt",
  CURRENT_TIMESTAMP
FROM accounts;
-- Log backup count, verify data integrity, and record in audit table
DO $$
DECLARE accounts_count INTEGER;
backup_count INTEGER;
total_balance DECIMAL(12, 2);
backup_total_balance DECIMAL(12, 2);
checksum TEXT;
BEGIN
SELECT COUNT(*) INTO accounts_count
FROM accounts;
SELECT COUNT(*) INTO backup_count
FROM accounts_backup;
SELECT COALESCE(SUM(balance), 0) INTO total_balance
FROM accounts;
SELECT COALESCE(SUM(balance), 0) INTO backup_total_balance
FROM accounts_backup;
-- Generate checksum from account IDs for verification
SELECT MD5(
    STRING_AGG(
      id,
      ','
      ORDER BY id
    )
  ) INTO checksum
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
-- Record in audit table
INSERT INTO migration_backups (
    migration_name,
    source_table,
    backup_table,
    row_count,
    checksum_value,
    total_balance,
    status
  )
VALUES (
    '20251224134949_add_nextauth_models',
    'accounts',
    'accounts_backup',
    backup_count,
    checksum,
    backup_total_balance,
    'backup_created'
  );
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
IF orphaned_accounts > 0 THEN -- Log warning but don't fail - orphaned accounts can still be backed up
RAISE WARNING 'Found % orphaned accounts (userId does not exist in users)',
orphaned_accounts;
-- Record in audit table
INSERT INTO migration_backups (
    migration_name,
    source_table,
    backup_table,
    row_count,
    status,
    notes
  )
VALUES (
    '20251224134949_add_nextauth_models',
    'accounts',
    'orphaned_check',
    orphaned_accounts,
    'warning',
    FORMAT(
      'Found %s accounts with non-existent userIds',
      orphaned_accounts
    )
  );
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
IF orphaned_transactions > 0 THEN -- Log warning but don't fail - transactions referencing missing accounts is a data issue to investigate
RAISE WARNING 'Found % transactions referencing non-existent accounts',
orphaned_transactions;
-- Record in audit table
INSERT INTO migration_backups (
    migration_name,
    source_table,
    backup_table,
    row_count,
    status,
    notes
  )
VALUES (
    '20251224134949_add_nextauth_models',
    'transactions',
    'orphaned_check',
    orphaned_transactions,
    'warning',
    FORMAT(
      'Found %s transactions with non-existent accountIds',
      orphaned_transactions
    )
  );
END IF;
END $$;
-- ============================================================================
-- STEP 4: Finalize backup status
-- ============================================================================
-- Update the in_progress record to indicate backup is complete
UPDATE migration_backups
SET status = 'backup_complete',
  notes = 'All backup tables created successfully'
WHERE migration_name = '20251224134949_add_nextauth_models'
  AND source_table = 'migration_backups'
  AND status = 'in_progress';
COMMIT;
-- ============================================================================
-- VERIFICATION QUERIES (run these manually to verify before proceeding)
-- ============================================================================
-- 
-- -- Check backup counts
-- SELECT COUNT(*) as email_verified_backups FROM users_emailverified_backup;
-- SELECT COUNT(*) as accounts_backups FROM accounts_backup;
-- SELECT COUNT(*) as original_accounts FROM accounts;
-- SELECT COUNT(*) as original_users_with_email_verified FROM users WHERE "emailVerified" IS NOT NULL;
-- 
-- -- View audit trail
-- SELECT * FROM migration_backups ORDER BY backup_timestamp DESC;
-- 
-- -- Verify checksums and balances
-- SELECT source_table, backup_table, row_count, checksum_value, total_balance, status 
-- FROM migration_backups 
-- WHERE migration_name = '20251224134949_add_nextauth_models';
--
-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- 1. Apply the main migration: npx prisma migrate deploy
-- 2. Run restore script: post-migration-data-restore.sql
-- 3. Verify data integrity
-- 4. Run cleanup script: post-migration-cleanup.sql
-- ============================================================================