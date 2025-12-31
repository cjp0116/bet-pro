-- ============================================================================
-- POST-MIGRATION CLEANUP SCRIPT
-- ============================================================================
-- This script drops backup tables ONLY after verification that:
-- 1. All emailVerified values were restored correctly
-- 2. All accounts were migrated to financial_accounts
-- 3. All foreign key relationships are intact
-- 4. Balance totals match
--
-- IMPORTANT:
-- - Run this ONLY after successful restore and verification
-- - This script is IRREVERSIBLE - backup tables will be dropped
-- - Audit metadata is preserved in migration_backups table
--
-- WORKFLOW:
-- 1. Run pre-migration-data-backup.sql (done)
-- 2. Apply main migration (done)
-- 3. Run post-migration-data-restore.sql (done)
-- 4. Verify data integrity manually (done)
-- 5. Run this script (post-migration-cleanup.sql)
-- ============================================================================
BEGIN;
-- ============================================================================
-- STEP 1: Pre-cleanup verification (FAIL-SAFE)
-- ============================================================================
-- These checks MUST pass before cleanup proceeds
-- Verify restore was completed
DO $$
DECLARE restore_status TEXT;
restore_count INTEGER;
BEGIN
SELECT COUNT(*) INTO restore_count
FROM migration_backups
WHERE migration_name = '20251224134949_add_nextauth_models'
  AND status = 'restore_complete';
IF restore_count = 0 THEN RAISE EXCEPTION 'No completed restore found. Run post-migration-data-restore.sql first.';
END IF;
-- Check no failed operations
SELECT COUNT(*) INTO restore_count
FROM migration_backups
WHERE migration_name = '20251224134949_add_nextauth_models'
  AND status = 'failed';
IF restore_count > 0 THEN RAISE EXCEPTION 'Found failed operations. Investigate before cleanup.';
END IF;
RAISE NOTICE 'Restore status verified. Proceeding with cleanup checks.';
END $$;
-- ============================================================================
-- STEP 2: Final data integrity verification
-- ============================================================================
-- Verify emailVerified counts
DO $$
DECLARE backup_count INTEGER;
restored_count INTEGER;
backup_exists BOOLEAN;
BEGIN
SELECT EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'users_emailverified_backup'
  ) INTO backup_exists;
IF backup_exists THEN
SELECT COUNT(*) INTO backup_count
FROM users_emailverified_backup;
SELECT COUNT(*) INTO restored_count
FROM users u
  INNER JOIN users_emailverified_backup b ON u.id = b.user_id
WHERE (u."emailVerified" = b.email_verified_timestamp)
  OR (
    u."emailVerified" IS NULL
    AND b.email_verified_timestamp IS NULL
  );
IF backup_count != restored_count THEN RAISE EXCEPTION 'EmailVerified count mismatch: backup=%, restored=%. DO NOT proceed with cleanup.',
backup_count,
restored_count;
END IF;
RAISE NOTICE 'EmailVerified verification passed: %/% users',
restored_count,
backup_count;
ELSE RAISE NOTICE 'users_emailverified_backup already cleaned up or does not exist.';
END IF;
END $$;
-- Verify accounts migration and balance
DO $$
DECLARE backup_count INTEGER;
migrated_count INTEGER;
backup_balance DECIMAL(12, 2);
current_balance DECIMAL(12, 2);
backup_exists BOOLEAN;
BEGIN
SELECT EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'accounts_backup'
  ) INTO backup_exists;
IF backup_exists THEN
SELECT COUNT(*) INTO backup_count
FROM accounts_backup;
SELECT COALESCE(SUM(balance), 0) INTO backup_balance
FROM accounts_backup;
SELECT COUNT(*) INTO migrated_count
FROM financial_accounts fa
WHERE EXISTS (
    SELECT 1
    FROM accounts_backup ab
    WHERE ab.id = fa.id
  );
SELECT COALESCE(SUM(balance), 0) INTO current_balance
FROM financial_accounts;
IF migrated_count < backup_count THEN RAISE EXCEPTION 'Account migration incomplete: backup=%, migrated=%. DO NOT proceed with cleanup.',
backup_count,
migrated_count;
END IF;
IF ABS(backup_balance - current_balance) > 0.01 THEN RAISE EXCEPTION 'Balance mismatch: backup=%, current=%. DO NOT proceed with cleanup.',
backup_balance,
current_balance;
END IF;
RAISE NOTICE 'Accounts verification passed: %/% accounts, balance: %',
migrated_count,
backup_count,
current_balance;
ELSE RAISE NOTICE 'accounts_backup already cleaned up or does not exist.';
END IF;
END $$;
-- Verify no orphaned transactions
DO $$
DECLARE orphaned_count INTEGER;
BEGIN
SELECT COUNT(*) INTO orphaned_count
FROM transactions t
WHERE NOT EXISTS (
    SELECT 1
    FROM financial_accounts fa
    WHERE fa.id = t."accountId"
  );
IF orphaned_count > 0 THEN RAISE EXCEPTION 'Found % orphaned transactions. DO NOT proceed with cleanup.',
orphaned_count;
END IF;
RAISE NOTICE 'FK verification passed: no orphaned transactions';
END $$;
-- ============================================================================
-- STEP 3: Archive metadata before cleanup
-- ============================================================================
-- Update audit records with final verification info
DO $$
DECLARE email_count INTEGER := 0;
accounts_count INTEGER := 0;
final_balance DECIMAL(12, 2) := 0;
email_exists BOOLEAN;
accounts_exists BOOLEAN;
BEGIN
SELECT EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'users_emailverified_backup'
  ) INTO email_exists;
SELECT EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'accounts_backup'
  ) INTO accounts_exists;
IF email_exists THEN
SELECT COUNT(*) INTO email_count
FROM users_emailverified_backup;
END IF;
IF accounts_exists THEN
SELECT COUNT(*) INTO accounts_count
FROM accounts_backup;
END IF;
SELECT COALESCE(SUM(balance), 0) INTO final_balance
FROM financial_accounts;
-- Record cleanup operation
INSERT INTO migration_backups (
    migration_name,
    source_table,
    backup_table,
    row_count,
    total_balance,
    status,
    notes,
    cleanup_timestamp
  )
VALUES (
    '20251224134949_add_nextauth_models',
    'cleanup_operation',
    'all',
    email_count + accounts_count,
    final_balance,
    'cleanup_started',
    FORMAT(
      'Cleanup initiated. Verified %s email backups, %s account backups, final balance: %s',
      email_count,
      accounts_count,
      final_balance
    ),
    CURRENT_TIMESTAMP
  );
END $$;
-- ============================================================================
-- STEP 4: Drop backup tables
-- ============================================================================
DROP TABLE IF EXISTS users_emailverified_backup;
DROP TABLE IF EXISTS accounts_backup;
RAISE NOTICE 'Backup tables dropped successfully.';
-- ============================================================================
-- STEP 5: Update audit trail with cleanup completion
-- ============================================================================
UPDATE migration_backups
SET status = 'cleaned_up',
  cleanup_timestamp = CURRENT_TIMESTAMP,
  notes = notes || ' | Backup tables dropped successfully.'
WHERE migration_name = '20251224134949_add_nextauth_models'
  AND status = 'cleanup_started';
-- Mark all records for this migration as finalized
UPDATE migration_backups
SET status = 'cleaned_up',
  cleanup_timestamp = COALESCE(cleanup_timestamp, CURRENT_TIMESTAMP)
WHERE migration_name = '20251224134949_add_nextauth_models'
  AND status IN (
    'backup_created',
    'backup_complete',
    'restored',
    'restore_complete'
  );
COMMIT;
-- ============================================================================
-- POST-CLEANUP VERIFICATION
-- ============================================================================
-- 
-- -- Verify backup tables are gone
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name IN ('users_emailverified_backup', 'accounts_backup');
-- 
-- -- View complete audit trail
-- SELECT id, source_table, backup_table, row_count, checksum_value, total_balance,
--        backup_timestamp, restore_timestamp, cleanup_timestamp, 
--        operator, status, notes
-- FROM migration_backups
-- WHERE migration_name = '20251224134949_add_nextauth_models'
-- ORDER BY backup_timestamp;
-- 
-- -- Summary
-- SELECT 
--   COUNT(*) as total_records,
--   COUNT(*) FILTER (WHERE status = 'cleaned_up') as cleaned_up,
--   COUNT(*) FILTER (WHERE status = 'failed') as failed
-- FROM migration_backups
-- WHERE migration_name = '20251224134949_add_nextauth_models';
--
-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- The migration_backups table is retained as a permanent audit trail.
-- You may archive or export this table as needed for compliance.
--
-- To view all migrations:
-- SELECT DISTINCT migration_name, MIN(backup_timestamp) as started, 
--        MAX(cleanup_timestamp) as completed
-- FROM migration_backups
-- GROUP BY migration_name
-- ORDER BY started;
-- ============================================================================