-- ============================================================================
-- MIGRATION TEST SCRIPT
-- ============================================================================
-- Run this on a staging snapshot to verify the migration process
-- This script performs a dry-run validation without modifying data
-- ============================================================================

BEGIN;

-- ============================================================================
-- Pre-Migration Validation
-- ============================================================================

-- Check current state
DO $$
DECLARE
    users_count INTEGER;
    users_with_email_verified INTEGER;
    accounts_count INTEGER;
    transactions_count INTEGER;
    total_balance DECIMAL(12,2);
BEGIN
    SELECT COUNT(*) INTO users_count FROM users;
    SELECT COUNT(*) INTO users_with_email_verified 
    FROM users WHERE "emailVerified" = true;
    SELECT COUNT(*) INTO accounts_count FROM accounts;
    SELECT COUNT(*) INTO transactions_count FROM transactions;
    SELECT COALESCE(SUM(balance), 0) INTO total_balance FROM accounts;
    
    RAISE NOTICE '=== PRE-MIGRATION STATE ===';
    RAISE NOTICE 'Users: %', users_count;
    RAISE NOTICE 'Users with emailVerified=true: %', users_with_email_verified;
    RAISE NOTICE 'Accounts: %', accounts_count;
    RAISE NOTICE 'Transactions: %', transactions_count;
    RAISE NOTICE 'Total balance: %', total_balance;
END $$;

-- Check for potential issues
DO $$
DECLARE
    orphaned_accounts INTEGER;
    orphaned_transactions INTEGER;
    duplicate_account_types INTEGER;
BEGIN
    -- Check for orphaned accounts
    SELECT COUNT(*) INTO orphaned_accounts
    FROM accounts a
    WHERE NOT EXISTS (
        SELECT 1 FROM users u WHERE u.id = a."userId"
    );
    
    -- Check for orphaned transactions
    SELECT COUNT(*) INTO orphaned_transactions
    FROM transactions t
    WHERE NOT EXISTS (
        SELECT 1 FROM accounts a WHERE a.id = t."accountId"
    );
    
    -- Check for duplicate account types per user (should be unique)
    SELECT COUNT(*) INTO duplicate_account_types
    FROM (
        SELECT "userId", "accountType", COUNT(*) as cnt
        FROM accounts
        GROUP BY "userId", "accountType"
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE '=== DATA INTEGRITY CHECKS ===';
    RAISE NOTICE 'Orphaned accounts: %', orphaned_accounts;
    RAISE NOTICE 'Orphaned transactions: %', orphaned_transactions;
    RAISE NOTICE 'Duplicate account types per user: %', duplicate_account_types;
    
    IF orphaned_accounts > 0 THEN
        RAISE WARNING 'Found orphaned accounts - these will cause migration issues';
    END IF;
    
    IF orphaned_transactions > 0 THEN
        RAISE WARNING 'Found orphaned transactions - foreign keys will break';
    END IF;
    
    IF duplicate_account_types > 0 THEN
        RAISE WARNING 'Found duplicate account types - unique constraint will fail';
    END IF;
END $$;

-- Simulate backup (without actually backing up)
DO $$
DECLARE
    email_verified_count INTEGER;
    accounts_to_backup INTEGER;
BEGIN
    SELECT COUNT(*) INTO email_verified_count
    FROM users WHERE "emailVerified" IS NOT NULL;
    
    SELECT COUNT(*) INTO accounts_to_backup FROM accounts;
    
    RAISE NOTICE '=== BACKUP SIMULATION ===';
    RAISE NOTICE 'Would backup emailVerified for % users', email_verified_count;
    RAISE NOTICE 'Would backup % accounts', accounts_to_backup;
END $$;

-- Check emailVerified conversion
DO $$
DECLARE
    true_count INTEGER;
    false_count INTEGER;
    null_count INTEGER;
    would_convert_to_timestamp INTEGER;
    would_convert_to_null INTEGER;
BEGIN
    SELECT COUNT(*) INTO true_count FROM users WHERE "emailVerified" = true;
    SELECT COUNT(*) INTO false_count FROM users WHERE "emailVerified" = false;
    SELECT COUNT(*) INTO null_count FROM users WHERE "emailVerified" IS NULL;
    
    -- Count how many would convert to timestamp
    SELECT COUNT(*) INTO would_convert_to_timestamp
    FROM users WHERE "emailVerified" = true;
    
    -- Count how many would convert to NULL
    SELECT COUNT(*) INTO would_convert_to_null
    FROM users WHERE "emailVerified" = false OR "emailVerified" IS NULL;
    
    RAISE NOTICE '=== EMAILVERIFIED CONVERSION ===';
    RAISE NOTICE 'Current: true=%, false=%, null=%', true_count, false_count, null_count;
    RAISE NOTICE 'Would convert: % to TIMESTAMP, % to NULL', 
        would_convert_to_timestamp, would_convert_to_null;
END $$;

-- Check account migration mapping
DO $$
DECLARE
    accounts_with_all_fields INTEGER;
    accounts_with_null_fields INTEGER;
BEGIN
    SELECT COUNT(*) INTO accounts_with_all_fields
    FROM accounts
    WHERE "userId" IS NOT NULL
      AND "accountType" IS NOT NULL
      AND balance IS NOT NULL;
    
    SELECT COUNT(*) INTO accounts_with_null_fields
    FROM accounts
    WHERE "userId" IS NULL
       OR "accountType" IS NULL
       OR balance IS NULL;
    
    RAISE NOTICE '=== ACCOUNT MIGRATION CHECK ===';
    RAISE NOTICE 'Accounts with all required fields: %', accounts_with_all_fields;
    RAISE NOTICE 'Accounts with NULL required fields: %', accounts_with_null_fields;
    
    IF accounts_with_null_fields > 0 THEN
        RAISE WARNING 'Some accounts have NULL in required fields - migration may fail';
    END IF;
END $$;

-- Check foreign key constraints
DO $$
DECLARE
    transactions_with_accounts INTEGER;
    transactions_without_accounts INTEGER;
BEGIN
    SELECT COUNT(*) INTO transactions_with_accounts
    FROM transactions t
    WHERE EXISTS (
        SELECT 1 FROM accounts a WHERE a.id = t."accountId"
    );
    
    SELECT COUNT(*) INTO transactions_without_accounts
    FROM transactions t
    WHERE NOT EXISTS (
        SELECT 1 FROM accounts a WHERE a.id = t."accountId"
    );
    
    RAISE NOTICE '=== FOREIGN KEY VALIDATION ===';
    RAISE NOTICE 'Transactions with valid accountId: %', transactions_with_accounts;
    RAISE NOTICE 'Transactions with invalid accountId: %', transactions_without_accounts;
    
    IF transactions_without_accounts > 0 THEN
        RAISE EXCEPTION 'Cannot proceed: % transactions reference non-existent accounts', 
            transactions_without_accounts;
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Post-Migration Validation (run after migration)
-- ============================================================================
-- Uncomment and run after applying the migration

/*
BEGIN;

-- Verify emailVerified restoration
DO $$
DECLARE
    users_with_timestamp INTEGER;
    users_with_null INTEGER;
BEGIN
    SELECT COUNT(*) INTO users_with_timestamp
    FROM users WHERE "emailVerified" IS NOT NULL;
    
    SELECT COUNT(*) INTO users_with_null
    FROM users WHERE "emailVerified" IS NULL;
    
    RAISE NOTICE '=== POST-MIGRATION: EMAILVERIFIED ===';
    RAISE NOTICE 'Users with timestamp: %', users_with_timestamp;
    RAISE NOTICE 'Users with NULL: %', users_with_null;
END $$;

-- Verify financial_accounts migration
DO $$
DECLARE
    financial_accounts_count INTEGER;
    total_balance DECIMAL(12,2);
    accounts_with_transactions INTEGER;
BEGIN
    SELECT COUNT(*) INTO financial_accounts_count FROM financial_accounts;
    SELECT COALESCE(SUM(balance), 0) INTO total_balance FROM financial_accounts;
    
    SELECT COUNT(DISTINCT "accountId") INTO accounts_with_transactions
    FROM transactions;
    
    RAISE NOTICE '=== POST-MIGRATION: FINANCIAL_ACCOUNTS ===';
    RAISE NOTICE 'Financial accounts: %', financial_accounts_count;
    RAISE NOTICE 'Total balance: %', total_balance;
    RAISE NOTICE 'Accounts with transactions: %', accounts_with_transactions;
END $$;

-- Verify foreign keys
DO $$
DECLARE
    orphaned_transactions INTEGER;
    invalid_user_ids INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_transactions
    FROM transactions t
    WHERE NOT EXISTS (
        SELECT 1 FROM financial_accounts fa WHERE fa.id = t."accountId"
    );
    
    SELECT COUNT(*) INTO invalid_user_ids
    FROM financial_accounts fa
    WHERE NOT EXISTS (
        SELECT 1 FROM users u WHERE u.id = fa."userId"
    );
    
    RAISE NOTICE '=== POST-MIGRATION: FOREIGN KEYS ===';
    RAISE NOTICE 'Orphaned transactions: %', orphaned_transactions;
    RAISE NOTICE 'Invalid user IDs: %', invalid_user_ids;
    
    IF orphaned_transactions > 0 OR invalid_user_ids > 0 THEN
        RAISE EXCEPTION 'Foreign key integrity check failed';
    END IF;
END $$;

COMMIT;
*/

