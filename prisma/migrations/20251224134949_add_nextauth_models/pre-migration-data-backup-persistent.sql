-- ============================================================================
-- PRE-MIGRATION DATA BACKUP SCRIPT (PERSISTENT VERSION)
-- ============================================================================
-- Alternative version using persistent tables instead of temp tables
-- Use this if you need to run backup and restore in separate sessions
-- 
-- IMPORTANT: Remember to clean up backup tables after successful migration
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create persistent backup tables
-- ============================================================================

-- Drop backup tables if they exist (from previous failed migration)
DROP TABLE IF EXISTS _migration_emailverified_backup CASCADE;
DROP TABLE IF EXISTS _migration_accounts_backup CASCADE;

-- Create backup table for emailVerified
CREATE TABLE _migration_emailverified_backup (
    user_id TEXT NOT NULL PRIMARY KEY,
    email_verified_timestamp TIMESTAMP(3),
    original_boolean BOOLEAN,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create backup table for accounts
CREATE TABLE _migration_accounts_backup (
    id TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountType" VARCHAR(20) NOT NULL DEFAULT 'main',
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    "availableBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lockedBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    "lastTransactionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    backup_created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- STEP 2: Backup users.emailVerified
-- ============================================================================

INSERT INTO _migration_emailverified_backup (user_id, email_verified_timestamp, original_boolean)
SELECT 
    id,
    CASE 
        WHEN "emailVerified" = true THEN COALESCE("createdAt", CURRENT_TIMESTAMP)
        ELSE NULL
    END,
    "emailVerified"
FROM users
WHERE "emailVerified" IS NOT NULL;

-- Log backup count
DO $$
DECLARE
    backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_count FROM _migration_emailverified_backup;
    RAISE NOTICE 'Backed up emailVerified for % users', backup_count;
END $$;

-- ============================================================================
-- STEP 3: Backup accounts table data
-- ============================================================================

INSERT INTO _migration_accounts_backup (
    id, "userId", "accountType", balance, "availableBalance", 
    "lockedBalance", currency, "lastTransactionAt", "createdAt", "updatedAt"
)
SELECT 
    id, "userId", "accountType", balance, "availableBalance",
    "lockedBalance", currency, "lastTransactionAt", "createdAt", "updatedAt"
FROM accounts;

-- Log backup count and verify data integrity
DO $$
DECLARE
    accounts_count INTEGER;
    backup_count INTEGER;
    total_balance DECIMAL(12,2);
    backup_total_balance DECIMAL(12,2);
BEGIN
    SELECT COUNT(*) INTO accounts_count FROM accounts;
    SELECT COUNT(*) INTO backup_count FROM _migration_accounts_backup;
    SELECT COALESCE(SUM(balance), 0) INTO total_balance FROM accounts;
    SELECT COALESCE(SUM(balance), 0) INTO backup_total_balance FROM _migration_accounts_backup;
    
    RAISE NOTICE 'Backed up % accounts (original: %)', backup_count, accounts_count;
    RAISE NOTICE 'Total balance: % (backup: %)', total_balance, backup_total_balance;
    
    -- Verify counts match
    IF accounts_count != backup_count THEN
        RAISE EXCEPTION 'Account count mismatch: original=%, backup=%', accounts_count, backup_count;
    END IF;
    
    -- Verify balance matches (within rounding tolerance)
    IF ABS(total_balance - backup_total_balance) > 0.01 THEN
        RAISE EXCEPTION 'Balance mismatch: original=%, backup=%', total_balance, backup_total_balance;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Verify foreign key relationships
-- ============================================================================

DO $$
DECLARE
    orphaned_accounts INTEGER;
    orphaned_transactions INTEGER;
BEGIN
    -- Check that all account userIds reference valid users
    SELECT COUNT(*) INTO orphaned_accounts
    FROM _migration_accounts_backup ab
    WHERE NOT EXISTS (
        SELECT 1 FROM users u WHERE u.id = ab."userId"
    );
    
    -- Check that all transaction accountIds reference valid accounts
    SELECT COUNT(*) INTO orphaned_transactions
    FROM transactions t
    WHERE NOT EXISTS (
        SELECT 1 FROM _migration_accounts_backup ab WHERE ab.id = t."accountId"
    );
    
    IF orphaned_accounts > 0 THEN
        RAISE WARNING 'Found % orphaned accounts (userId does not exist in users)', orphaned_accounts;
    END IF;
    
    IF orphaned_transactions > 0 THEN
        RAISE WARNING 'Found % transactions referencing non-existent accounts', orphaned_transactions;
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- SELECT COUNT(*) as email_verified_backups FROM _migration_emailverified_backup;
-- SELECT COUNT(*) as accounts_backups FROM _migration_accounts_backup;
-- SELECT COUNT(*) as original_accounts FROM accounts;
-- SELECT COUNT(*) as original_users_with_email_verified FROM users WHERE "emailVerified" IS NOT NULL;

