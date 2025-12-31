-- ============================================================================
-- POST-MIGRATION DATA RESTORATION SCRIPT (PERSISTENT VERSION)
-- ============================================================================
-- Use this with the persistent backup script
-- Run this AFTER applying the main migration
-- ============================================================================
BEGIN;
-- ============================================================================
-- Verify backup tables exist
-- ============================================================================
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_name = '_migration_emailverified_backup'
) THEN RAISE EXCEPTION 'Backup table _migration_emailverified_backup not found. Run pre-migration backup first.';
END IF;
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_name = '_migration_accounts_backup'
) THEN RAISE EXCEPTION 'Backup table _migration_accounts_backup not found. Run pre-migration backup first.';
END IF;
END $$;
-- ============================================================================
-- STEP 1: Restore emailVerified values
-- ============================================================================
UPDATE users u
SET "emailVerified" = b.email_verified_timestamp
FROM _migration_emailverified_backup b
WHERE u.id = b.user_id
  AND b.email_verified_timestamp IS NOT NULL;
-- Set NULL for users who had false
UPDATE users u
SET "emailVerified" = NULL
FROM _migration_emailverified_backup b
WHERE u.id = b.user_id
  AND b.email_verified_timestamp IS NULL;
-- Verify restoration
DO $$
DECLARE restored_count INTEGER;
backup_count INTEGER;
null_count INTEGER;
BEGIN
SELECT COUNT(*) INTO restored_count
FROM users u
  INNER JOIN _migration_emailverified_backup b ON u.id = b.user_id
WHERE (u."emailVerified" = b.email_verified_timestamp)
  OR (
    u."emailVerified" IS NULL
    AND b.email_verified_timestamp IS NULL
  );
SELECT COUNT(*) INTO backup_count
FROM _migration_emailverified_backup;
SELECT COUNT(*) INTO null_count
FROM users u
  INNER JOIN _migration_emailverified_backup b ON u.id = b.user_id
WHERE u."emailVerified" IS NULL
  AND b.email_verified_timestamp IS NULL;
RAISE NOTICE 'Restored emailVerified for %/% users (NULL values: %)',
restored_count,
backup_count,
null_count;
IF restored_count != backup_count THEN RAISE EXCEPTION 'EmailVerified restoration mismatch: restored=%, backup=%',
restored_count,
backup_count;
END IF;
END $$;
-- ============================================================================
-- STEP 2: Migrate accounts to financial_accounts
-- ============================================================================
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
FROM _migration_accounts_backup ON CONFLICT (id) DO NOTHING;
-- Verify migration
DO $$
DECLARE migrated_count INTEGER;
backup_count INTEGER;
total_balance DECIMAL(12, 2);
migrated_total_balance DECIMAL(12, 2);
orphaned_transactions INTEGER;
BEGIN
SELECT COUNT(*) INTO migrated_count
FROM financial_accounts fa
WHERE EXISTS (SELECT 1 FROM _migration_accounts_backup ab WHERE ab.id = fa.id);
SELECT COUNT(*) INTO backup_count
FROM _migration_accounts_backup;
SELECT COALESCE(SUM(balance), 0) INTO total_balance
FROM _migration_accounts_backup;
SELECT COALESCE(SUM(balance), 0) INTO migrated_total_balance
FROM financial_accounts fa
WHERE EXISTS (SELECT 1 FROM _migration_accounts_backup ab WHERE ab.id = fa.id);
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
IF migrated_count < backup_count THEN RAISE WARNING 'Some accounts were not migrated: backup=%, migrated=%',
backup_count,
migrated_count;
END IF;
IF ABS(total_balance - migrated_total_balance) > 0.01 THEN RAISE EXCEPTION 'Balance mismatch after migration: backup=%, migrated=%',
total_balance,
migrated_total_balance;
END IF;
IF orphaned_transactions > 0 THEN RAISE WARNING 'Found % transactions with invalid accountId after migration',
orphaned_transactions;
END IF;
END $$;
-- ============================================================================
-- STEP 3: Verify foreign key integrity
-- ============================================================================
DO $$
DECLARE invalid_user_ids INTEGER;
invalid_account_ids INTEGER;
BEGIN
SELECT COUNT(*) INTO invalid_user_ids
FROM financial_accounts fa
WHERE NOT EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = fa."userId"
  );
SELECT COUNT(*) INTO invalid_account_ids
FROM transactions t
WHERE NOT EXISTS (
    SELECT 1
    FROM financial_accounts fa
    WHERE fa.id = t."accountId"
  );
IF invalid_user_ids > 0 THEN RAISE EXCEPTION 'Found % financial_accounts with invalid userId',
invalid_user_ids;
END IF;
IF invalid_account_ids > 0 THEN RAISE EXCEPTION 'Found % transactions with invalid accountId',
invalid_account_ids;
END IF;
END $$;
COMMIT;
-- ============================================================================
-- CLEANUP: Drop backup tables (ONLY after successful verification)
-- ============================================================================
-- Uncomment these lines ONLY after verifying everything is correct
/*
 BEGIN;
 DROP TABLE IF EXISTS _migration_emailverified_backup;
 DROP TABLE IF EXISTS _migration_accounts_backup;
 COMMIT;
 */
-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- SELECT COUNT(*) as users_with_email_verified FROM users WHERE "emailVerified" IS NOT NULL;
-- SELECT COUNT(*) as financial_accounts_count FROM financial_accounts;
-- SELECT COUNT(*) as transactions_count FROM transactions;
-- SELECT SUM(balance) as total_balance FROM financial_accounts;