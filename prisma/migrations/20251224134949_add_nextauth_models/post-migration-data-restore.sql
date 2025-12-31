-- ============================================================================
-- POST-MIGRATION DATA RESTORATION SCRIPT
-- ============================================================================
-- This script restores data after the schema migration:
-- 1. Restores emailVerified values (converted from BOOLEAN to TIMESTAMP)
-- 2. Migrates accounts data to financial_accounts
--
-- IMPORTANT:
-- - Run this IMMEDIATELY AFTER applying the main migration
-- - Ensure the main migration completed successfully
-- - Run in the same session as pre-migration backup (temp tables must exist)
-- ============================================================================
BEGIN;
-- ============================================================================
-- STEP 4: Restore emailVerified values
-- ============================================================================
-- Update users.emailVerified from backup
-- Handle NULL values properly
UPDATE users u
SET "emailVerified" = b.email_verified_timestamp
FROM users_emailverified_backup b
WHERE u.id = b.user_id
  AND b.email_verified_timestamp IS NOT NULL;
-- Set NULL for users who had false (already NULL by default, but explicit for clarity)
UPDATE users u
SET "emailVerified" = NULL
FROM users_emailverified_backup b
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
-- STEP 5: Migrate accounts to financial_accounts
-- ============================================================================
-- Insert all accounts data into financial_accounts
-- Preserve all IDs and foreign key relationships
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
-- Safety: skip if already exists
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
-- Warn about orphaned transactions (should be 0)
IF orphaned_transactions > 0 THEN RAISE WARNING 'Found % transactions with invalid accountId after migration',
orphaned_transactions;
END IF;
END $$;
-- ============================================================================
-- STEP 6: Verify foreign key integrity
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
END $$;
COMMIT;
-- ============================================================================
-- CLEANUP: Drop temporary tables
-- ============================================================================
-- Note: Temp tables are automatically dropped when session ends
-- But we can explicitly drop them for clarity
DROP TABLE IF EXISTS users_emailverified_backup;
DROP TABLE IF EXISTS accounts_backup;
-- ============================================================================
-- VERIFICATION QUERIES (run these manually to verify restoration)
-- ============================================================================
-- SELECT COUNT(*) as users_with_email_verified FROM users WHERE "emailVerified" IS NOT NULL;
-- SELECT COUNT(*) as financial_accounts_count FROM financial_accounts;
-- SELECT COUNT(*) as transactions_count FROM transactions;
-- SELECT SUM(balance) as total_balance FROM financial_accounts;
-- 
-- -- Check for any data inconsistencies
-- SELECT 
--     u.id,
--     u.email,
--     u."emailVerified",
--     b.original_boolean,
--     b.email_verified_timestamp
-- FROM users u
-- LEFT JOIN users_emailverified_backup b ON u.id = b.user_id
-- WHERE b.user_id IS NOT NULL
-- ORDER BY u."createdAt" DESC
-- LIMIT 10;
-- 
-- -- Verify account migration
-- SELECT 
--     fa.id,
--     fa."userId",
--     fa."accountType",
--     fa.balance,
--     ab.balance as backup_balance
-- FROM financial_accounts fa
-- INNER JOIN accounts_backup ab ON fa.id = ab.id
-- WHERE ABS(fa.balance - ab.balance) > 0.01
-- LIMIT 10;