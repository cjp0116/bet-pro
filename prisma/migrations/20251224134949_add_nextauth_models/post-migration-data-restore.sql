-- ============================================================================
-- POST-MIGRATION DATA RESTORATION SCRIPT
-- ============================================================================
-- This script restores data after the schema migration:
-- 1. Restores emailVerified values (converted from BOOLEAN to TIMESTAMP)
-- 2. Migrates accounts data to financial_accounts
--
-- IMPORTANT:
-- - Run this AFTER applying the main migration
-- - Ensure the main migration completed successfully
-- - Backup tables must exist (from pre-migration-data-backup.sql)
--
-- WORKFLOW:
-- 1. Run pre-migration-data-backup.sql (already done)
-- 2. Apply main migration (already done)
-- 3. Run this script (post-migration-data-restore.sql)
-- 4. Verify data integrity
-- 5. Run cleanup script (post-migration-cleanup.sql)
-- ============================================================================
BEGIN;
-- ============================================================================
-- STEP 1: Pre-restore validation
-- ============================================================================
-- Verify backup tables exist and have data
DO $$
DECLARE email_backup_exists BOOLEAN;
accounts_backup_exists BOOLEAN;
email_backup_count INTEGER;
accounts_backup_count INTEGER;
BEGIN -- Check if backup tables exist
SELECT EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'users_emailverified_backup'
  ) INTO email_backup_exists;
SELECT EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'accounts_backup'
  ) INTO accounts_backup_exists;
IF NOT email_backup_exists THEN RAISE EXCEPTION 'users_emailverified_backup table not found. Run pre-migration-data-backup.sql first.';
END IF;
IF NOT accounts_backup_exists THEN RAISE EXCEPTION 'accounts_backup table not found. Run pre-migration-data-backup.sql first.';
END IF;
-- Check row counts
SELECT COUNT(*) INTO email_backup_count
FROM users_emailverified_backup;
SELECT COUNT(*) INTO accounts_backup_count
FROM accounts_backup;
RAISE NOTICE 'Found backup data: emailVerified=%, accounts=%',
email_backup_count,
accounts_backup_count;
END $$;
-- ============================================================================
-- STEP 2: Verify migration_backups audit table
-- ============================================================================
DO $$
DECLARE backup_status TEXT;
BEGIN
SELECT status INTO backup_status
FROM migration_backups
WHERE migration_name = '20251224134949_add_nextauth_models'
  AND source_table = 'migration_backups'
ORDER BY backup_timestamp DESC
LIMIT 1;
IF backup_status IS NULL THEN RAISE EXCEPTION 'No backup record found in migration_backups. Run pre-migration-data-backup.sql first.';
END IF;
IF backup_status NOT IN ('backup_complete', 'backup_created') THEN RAISE WARNING 'Unexpected backup status: %. Proceeding with caution.',
backup_status;
END IF;
RAISE NOTICE 'Backup status verified: %',
backup_status;
END $$;
-- Record restore start in audit table
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
    'restore_operation',
    'all',
    0,
    'restore_started',
    'Restore operation initiated'
  );
-- ============================================================================
-- STEP 3: Restore emailVerified values (idempotent)
-- ============================================================================
-- Update users.emailVerified from backup
-- Handle NULL values properly
UPDATE users u
SET "emailVerified" = b.email_verified_timestamp
FROM users_emailverified_backup b
WHERE u.id = b.user_id
  AND b.email_verified_timestamp IS NOT NULL
  AND (
    u."emailVerified" IS DISTINCT
    FROM b.email_verified_timestamp
  );
-- Set NULL for users who had false (explicit for clarity)
UPDATE users u
SET "emailVerified" = NULL
FROM users_emailverified_backup b
WHERE u.id = b.user_id
  AND b.email_verified_timestamp IS NULL
  AND u."emailVerified" IS NOT NULL;
-- Verify restoration
DO $$
DECLARE restored_count INTEGER;
backup_count INTEGER;
null_count INTEGER;
checksum_before TEXT;
checksum_after TEXT;
BEGIN
SELECT COUNT(*) INTO restored_count
FROM users u
  INNER JOIN users_emailverified_backup b ON u.id = b.user_id
WHERE (u."emailVerified" = b.email_verified_timestamp)
  OR (
    u."emailVerified" IS NULL
    AND b.email_verified_timestamp IS NULL
  );
SELECT COUNT(*) INTO backup_count
FROM users_emailverified_backup;
SELECT COUNT(*) INTO null_count
FROM users u
  INNER JOIN users_emailverified_backup b ON u.id = b.user_id
WHERE u."emailVerified" IS NULL
  AND b.email_verified_timestamp IS NULL;
-- Verify checksum matches
SELECT checksum_value INTO checksum_before
FROM migration_backups
WHERE migration_name = '20251224134949_add_nextauth_models'
  AND source_table = 'users'
ORDER BY backup_timestamp DESC
LIMIT 1;
SELECT MD5(
    STRING_AGG(
      user_id,
      ','
      ORDER BY user_id
    )
  ) INTO checksum_after
FROM users_emailverified_backup;
RAISE NOTICE 'Restored emailVerified for %/% users (NULL values: %)',
restored_count,
backup_count,
null_count;
IF restored_count != backup_count THEN RAISE EXCEPTION 'EmailVerified restoration mismatch: restored=%, backup=%',
restored_count,
backup_count;
END IF;
IF checksum_before IS NOT NULL
AND checksum_before != checksum_after THEN RAISE EXCEPTION 'EmailVerified checksum mismatch: expected=%, actual=%',
checksum_before,
checksum_after;
END IF;
-- Update audit record
UPDATE migration_backups
SET restore_timestamp = CURRENT_TIMESTAMP,
  status = 'restored',
  notes = 'emailVerified values restored successfully'
WHERE migration_name = '20251224134949_add_nextauth_models'
  AND source_table = 'users'
  AND status = 'backup_created';
END $$;
-- ============================================================================
-- STEP 4: Migrate accounts to financial_accounts (idempotent)
-- ============================================================================
-- Insert all accounts data into financial_accounts
-- ON CONFLICT ensures idempotency - skip if already exists
INSERT INTO financial_accounts (
    id,
    "userId",
    "accountType",
    balance,
    "availableBalance",
    "lockedBalance",
    currency,
    "lastTransactionAt",
    "createdAt",
    "updatedAt"
  )
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
FROM accounts_backup ON CONFLICT (id) DO NOTHING;
-- Idempotent: skip if already migrated
-- Verify migration
DO $$
DECLARE migrated_count INTEGER;
backup_count INTEGER;
total_balance DECIMAL(12, 2);
migrated_total_balance DECIMAL(12, 2);
orphaned_transactions INTEGER;
checksum_before TEXT;
checksum_after TEXT;
expected_balance DECIMAL(12, 2);
BEGIN
SELECT COUNT(*) INTO migrated_count
FROM financial_accounts fa
WHERE EXISTS (
    SELECT 1
    FROM accounts_backup ab
    WHERE ab.id = fa.id
  );
SELECT COUNT(*) INTO backup_count
FROM accounts_backup;
SELECT COALESCE(SUM(balance), 0) INTO total_balance
FROM accounts_backup;
SELECT COALESCE(SUM(balance), 0) INTO migrated_total_balance
FROM financial_accounts;
-- Get expected values from audit table
SELECT checksum_value,
  total_balance INTO checksum_before,
  expected_balance
FROM migration_backups
WHERE migration_name = '20251224134949_add_nextauth_models'
  AND source_table = 'accounts'
ORDER BY backup_timestamp DESC
LIMIT 1;
SELECT MD5(
    STRING_AGG(
      id,
      ','
      ORDER BY id
    )
  ) INTO checksum_after
FROM accounts_backup;
-- Check for transactions with invalid accountIds
SELECT COUNT(*) INTO orphaned_transactions
FROM transactions t
WHERE NOT EXISTS (
    SELECT 1
    FROM financial_accounts fa
    WHERE fa.id = t."accountId"
  );
RAISE NOTICE 'Migrated %/% accounts to financial_accounts',
migrated_count,
backup_count;
RAISE NOTICE 'Total balance: % (migrated: %)',
total_balance,
migrated_total_balance;
RAISE NOTICE 'Orphaned transactions: %',
orphaned_transactions;
-- Verify counts match
IF migrated_count < backup_count THEN RAISE WARNING 'Some accounts were not migrated: backup=%, migrated=%',
backup_count,
migrated_count;
END IF;
-- Verify balance matches (within rounding tolerance)
IF ABS(total_balance - migrated_total_balance) > 0.01 THEN RAISE EXCEPTION 'Balance mismatch after migration: backup=%, migrated=%',
total_balance,
migrated_total_balance;
END IF;
-- Verify checksum if available
IF checksum_before IS NOT NULL
AND checksum_before != checksum_after THEN RAISE EXCEPTION 'Accounts checksum mismatch: expected=%, actual=%',
checksum_before,
checksum_after;
END IF;
-- Verify expected balance from audit
IF expected_balance IS NOT NULL
AND ABS(expected_balance - migrated_total_balance) > 0.01 THEN RAISE EXCEPTION 'Balance does not match audit record: expected=%, actual=%',
expected_balance,
migrated_total_balance;
END IF;
-- Warn about orphaned transactions (should be 0)
IF orphaned_transactions > 0 THEN RAISE WARNING 'Found % transactions with invalid accountId after migration',
orphaned_transactions;
END IF;
-- Update audit record
UPDATE migration_backups
SET restore_timestamp = CURRENT_TIMESTAMP,
  status = 'restored',
  notes = 'Accounts migrated to financial_accounts successfully'
WHERE migration_name = '20251224134949_add_nextauth_models'
  AND source_table = 'accounts'
  AND status = 'backup_created';
END $$;
-- ============================================================================
-- STEP 5: Verify foreign key integrity
-- ============================================================================
-- Verify all financial_accounts have valid userIds
DO $$
DECLARE invalid_user_ids INTEGER;
BEGIN
SELECT COUNT(*) INTO invalid_user_ids
FROM financial_accounts fa
WHERE NOT EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = fa."userId"
  );
IF invalid_user_ids > 0 THEN RAISE EXCEPTION 'Found % financial_accounts with invalid userId',
invalid_user_ids;
END IF;
RAISE NOTICE 'FK validation passed: all financial_accounts have valid userIds';
END $$;
-- Verify all transactions reference valid financial_accounts
DO $$
DECLARE invalid_account_ids INTEGER;
BEGIN
SELECT COUNT(*) INTO invalid_account_ids
FROM transactions t
WHERE NOT EXISTS (
    SELECT 1
    FROM financial_accounts fa
    WHERE fa.id = t."accountId"
  );
IF invalid_account_ids > 0 THEN RAISE EXCEPTION 'Found % transactions with invalid accountId',
invalid_account_ids;
END IF;
RAISE NOTICE 'FK validation passed: all transactions have valid accountIds';
END $$;
-- ============================================================================
-- STEP 6: Update audit trail with final status
-- ============================================================================
UPDATE migration_backups
SET status = 'restore_complete',
  restore_timestamp = CURRENT_TIMESTAMP,
  notes = 'All data restored and verified successfully'
WHERE migration_name = '20251224134949_add_nextauth_models'
  AND source_table = 'restore_operation'
  AND status = 'restore_started';
COMMIT;
-- ============================================================================
-- FAIL-SAFE VERIFICATION QUERIES (run before cleanup)
-- ============================================================================
-- 
-- -- 1. Verify user counts match
-- SELECT 
--   (SELECT COUNT(*) FROM users_emailverified_backup) as backup_count,
--   (SELECT COUNT(*) FROM users u 
--    INNER JOIN users_emailverified_backup b ON u.id = b.user_id
--    WHERE (u."emailVerified" = b.email_verified_timestamp)
--       OR (u."emailVerified" IS NULL AND b.email_verified_timestamp IS NULL)) as restored_count;
-- 
-- -- 2. Verify account migration
-- SELECT 
--   (SELECT COUNT(*) FROM accounts_backup) as backup_count,
--   (SELECT COUNT(*) FROM financial_accounts fa 
--    WHERE EXISTS (SELECT 1 FROM accounts_backup ab WHERE ab.id = fa.id)) as migrated_count;
-- 
-- -- 3. Verify balances
-- SELECT
--   (SELECT COALESCE(SUM(balance), 0) FROM accounts_backup) as backup_balance,
--   (SELECT COALESCE(SUM(balance), 0) FROM financial_accounts) as current_balance;
-- 
-- -- 4. Check for orphaned transactions
-- SELECT COUNT(*) as orphaned_transactions
-- FROM transactions t
-- WHERE NOT EXISTS (SELECT 1 FROM financial_accounts fa WHERE fa.id = t."accountId");
-- 
-- -- 5. View audit trail
-- SELECT id, source_table, row_count, checksum_value, total_balance, 
--        backup_timestamp, restore_timestamp, status, notes
-- FROM migration_backups
-- WHERE migration_name = '20251224134949_add_nextauth_models'
-- ORDER BY backup_timestamp;
--
-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- 1. Run the verification queries above
-- 2. Test application functionality
-- 3. If all looks good, run: post-migration-cleanup.sql
-- 4. If issues found, investigate before cleanup (backup tables still exist)
-- ============================================================================