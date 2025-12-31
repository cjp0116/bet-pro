# Data Migration Guide: NextAuth Models Migration

## Overview

This migration introduces NextAuth models and restructures the database:

- Changes `users.emailVerified` from `BOOLEAN` to `TIMESTAMP(3)`
- Drops `accounts` table and creates `financial_accounts` (same structure)
- Adds new tables: `oauth_accounts`, `auth_sessions`, `verification_tokens`

## ⚠️ CRITICAL: Data Loss Prevention

This migration will cause **data loss** if not handled properly:

- All `users.emailVerified` values will be lost
- All `accounts` table data will be lost

## Migration Files

| File                              | Purpose                                       |
| --------------------------------- | --------------------------------------------- |
| `pre-migration-data-backup.sql`   | Creates backup tables + audit metadata        |
| `migration.sql`                   | Prisma schema migration (auto-generated)      |
| `post-migration-data-restore.sql` | Restores data with idempotency + verification |
| `post-migration-cleanup.sql`      | Drops backup tables after verification        |
| `test-migration.sql`              | Validation script for staging                 |

## Prerequisites

1. **Database Backup**: Export a full database backup before proceeding

   ```bash
   pg_dump -h localhost -U your_user -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Staging Test**: Test the entire migration process on a staging snapshot first

3. **Maintenance Window**: Schedule a maintenance window for production

---

## Migration Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MIGRATION WORKFLOW DIAGRAM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │  1. BACKUP      │────▶│  2. MIGRATE     │────▶│  3. RESTORE     │       │
│  │  (pre-backup)   │     │  (prisma)       │     │  (post-restore) │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│         │                                               │                   │
│         ▼                                               ▼                   │
│  ┌─────────────────┐                          ┌─────────────────┐          │
│  │ migration_backups│                          │  4. VERIFY      │          │
│  │ audit table     │                          │  (manual checks)│          │
│  └─────────────────┘                          └────────┬────────┘          │
│                                                        │                   │
│                     ┌──────────────────────────────────┤                   │
│                     ▼                                  ▼                   │
│              ┌─────────────┐                    ┌─────────────┐            │
│              │ FAIL?       │                    │ SUCCESS?    │            │
│              │ Investigate │                    │ 5. CLEANUP  │            │
│              │ + Rollback  │                    │ (cleanup)   │            │
│              └─────────────┘                    └─────────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Instructions

### Step 1: Pre-Migration Backup

Run the backup script to create backup tables and audit metadata:

```bash
psql -h localhost -U your_user -d your_database -f pre-migration-data-backup.sql
```

This script:

- Creates `migration_backups` audit table (persistent)
- Creates `users_emailverified_backup` table
- Creates `accounts_backup` table
- Records row counts, checksums, and balances for verification
- Validates data integrity before migration

**Verify backup:**

```sql
SELECT source_table, backup_table, row_count, checksum_value, total_balance, status
FROM migration_backups
WHERE migration_name = '20251224134949_add_nextauth_models';
```

### Step 2: Apply Schema Migration

Apply the main Prisma migration:

```bash
npx prisma migrate deploy
# OR for manual application:
npx prisma migrate resolve --applied 20251224134949_add_nextauth_models
```

### Step 3: Post-Migration Restore

Run the restore script to migrate data to the new schema:

```bash
psql -h localhost -U your_user -d your_database -f post-migration-data-restore.sql
```

This script:

- Validates backup tables exist
- Restores `emailVerified` values (BOOLEAN → TIMESTAMP conversion)
- Migrates `accounts` data to `financial_accounts`
- Uses `ON CONFLICT` for idempotency (safe to re-run)
- Validates checksums and balances match audit records
- Updates audit trail with restore status

### Step 4: Verification

Run these verification queries before cleanup:

```sql
-- 1. Verify emailVerified restoration
SELECT
  (SELECT COUNT(*) FROM users_emailverified_backup) as backup_count,
  (SELECT COUNT(*) FROM users u
   INNER JOIN users_emailverified_backup b ON u.id = b.user_id
   WHERE (u."emailVerified" = b.email_verified_timestamp)
      OR (u."emailVerified" IS NULL AND b.email_verified_timestamp IS NULL)) as restored_count;

-- 2. Verify account migration
SELECT
  (SELECT COUNT(*) FROM accounts_backup) as backup_count,
  (SELECT COUNT(*) FROM financial_accounts fa
   WHERE EXISTS (SELECT 1 FROM accounts_backup ab WHERE ab.id = fa.id)) as migrated_count;

-- 3. Verify balances match
SELECT
  (SELECT COALESCE(SUM(balance), 0) FROM accounts_backup) as backup_balance,
  (SELECT COALESCE(SUM(balance), 0) FROM financial_accounts) as current_balance;

-- 4. Check for orphaned transactions (should be 0)
SELECT COUNT(*) as orphaned_transactions
FROM transactions t
WHERE NOT EXISTS (SELECT 1 FROM financial_accounts fa WHERE fa.id = t."accountId");

-- 5. View complete audit trail
SELECT id, source_table, row_count, checksum_value, total_balance,
       backup_timestamp, restore_timestamp, status, notes
FROM migration_backups
WHERE migration_name = '20251224134949_add_nextauth_models'
ORDER BY backup_timestamp;
```

**All checks must pass before proceeding to cleanup.**

### Step 5: Cleanup (Only After Verification)

Once verification is complete and application is tested:

```bash
psql -h localhost -U your_user -d your_database -f post-migration-cleanup.sql
```

This script:

- Performs final verification checks (fail-safe)
- Archives metadata in `migration_backups`
- Drops backup tables
- Updates audit trail with cleanup status

---

## Audit Trail: `migration_backups` Table

The `migration_backups` table provides a permanent audit trail:

| Column              | Description                         |
| ------------------- | ----------------------------------- |
| `id`                | Auto-incrementing primary key       |
| `migration_name`    | Migration identifier                |
| `source_table`      | Original table name                 |
| `backup_table`      | Backup table name                   |
| `row_count`         | Number of rows backed up            |
| `checksum_value`    | MD5 hash for verification           |
| `total_balance`     | Sum of balances (financial tables)  |
| `backup_timestamp`  | When backup was created             |
| `restore_timestamp` | When restore was completed          |
| `cleanup_timestamp` | When cleanup was completed          |
| `operator`          | Database user who ran the operation |
| `status`            | Current status of the backup        |
| `notes`             | Additional information              |

**Status values:**

- `in_progress` - Backup operation started
- `backup_created` - Backup table created with data
- `backup_complete` - All backups completed successfully
- `restore_started` - Restore operation initiated
- `restored` - Data restored from backup
- `restore_complete` - All restores completed
- `cleanup_started` - Cleanup initiated
- `cleaned_up` - Backup tables dropped, migration complete
- `failed` - Operation failed (investigate)

---

## Data Transformation Rules

### emailVerified Conversion

- **BOOLEAN `true`** → **TIMESTAMP** (user's `createdAt` or current timestamp)
- **BOOLEAN `false`** → **NULL**

### Accounts Migration

The `accounts` table maps directly to `financial_accounts`:

- All columns map 1:1
- All IDs are preserved
- All foreign key relationships are maintained

---

## Rollback Plan

### Before Cleanup (Backup Tables Exist)

If issues are found before running `post-migration-cleanup.sql`:

1. Backup tables still exist - data can be re-verified
2. Investigate the specific failure
3. Re-run `post-migration-data-restore.sql` (idempotent)
4. If migration itself failed, restore from full database backup

### After Cleanup

If issues are found after cleanup:

1. Restore from the full database backup created in prerequisites
2. The `migration_backups` table contains checksums and balances for validation
3. Contact database administrator

---

## Idempotency

All scripts are designed to be safely re-run:

| Script                            | Idempotency Mechanism                                                    |
| --------------------------------- | ------------------------------------------------------------------------ |
| `pre-migration-data-backup.sql`   | `CREATE TABLE IF NOT EXISTS`, deletes existing backup data before insert |
| `post-migration-data-restore.sql` | `ON CONFLICT DO NOTHING`, `IS DISTINCT FROM` checks                      |
| `post-migration-cleanup.sql`      | `DROP TABLE IF EXISTS`, status checks before operations                  |

---

## Testing Checklist

Before production:

- [ ] Export full database backup
- [ ] Run `test-migration.sql` on staging snapshot
- [ ] Run complete workflow: backup → migrate → restore → verify
- [ ] Verify all `emailVerified` values restored correctly
- [ ] Verify all accounts migrated to `financial_accounts`
- [ ] Verify transaction foreign keys intact
- [ ] Verify no orphaned records
- [ ] Verify balance totals match
- [ ] Verify audit trail is complete
- [ ] Test application functionality
- [ ] Run cleanup on staging
- [ ] Verify staging is fully functional post-cleanup

---

## Production Deployment

```bash
# 1. Export backup
pg_dump -h localhost -U your_user -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run pre-migration backup
psql -h localhost -U your_user -d your_database -f pre-migration-data-backup.sql

# 3. Apply schema migration
npx prisma migrate deploy

# 4. Run post-migration restore
psql -h localhost -U your_user -d your_database -f post-migration-data-restore.sql

# 5. Verify data integrity (run verification queries)

# 6. Test application functionality

# 7. If all verified, run cleanup
psql -h localhost -U your_user -d your_database -f post-migration-cleanup.sql

# 8. Monitor for errors in logs
```

---

## Troubleshooting

### Backup Table Not Found

```
ERROR: relation "users_emailverified_backup" does not exist
```

**Solution:** Run `pre-migration-data-backup.sql` first.

### Data Count Mismatch

```
ERROR: EmailVerified restoration mismatch
```

**Solution:**

- Check for constraint violations
- Check for duplicate IDs
- Review migration logs
- Verify source data wasn't modified during migration

### Balance Mismatch

```
ERROR: Balance mismatch after migration
```

**Solution:**

- Check for rounding issues (tolerance: 0.01)
- Verify all accounts were migrated
- Check for NULL values
- Compare with audit trail: `SELECT total_balance FROM migration_backups WHERE source_table = 'accounts'`

### Checksum Mismatch

```
ERROR: Accounts checksum mismatch
```

**Solution:**

- Data may have been modified between backup and restore
- Check for deleted or added records
- Re-run backup if source data is authoritative

### Orphaned Transactions

```
WARNING: Found N transactions with invalid accountId
```

**Solution:**

- Some accounts may not have been migrated
- Check for accounts in backup but not in financial_accounts
- Investigate specific transaction accountIds

---

## Support

If you encounter issues:

1. Check the audit trail: `SELECT * FROM migration_backups ORDER BY backup_timestamp DESC`
2. Review migration logs
3. Run verification queries
4. Restore from backup if needed
5. Contact database administrator

---

## Files Reference

```
prisma/migrations/20251224134949_add_nextauth_models/
├── migration.sql                      # Prisma-generated schema migration
├── pre-migration-data-backup.sql      # Step 1: Backup script
├── post-migration-data-restore.sql    # Step 3: Restore script
├── post-migration-cleanup.sql         # Step 5: Cleanup script
├── pre-migration-data-backup-persistent.sql   # Alternative: persistent backup
├── post-migration-data-restore-persistent.sql # Alternative: persistent restore
├── test-migration.sql                 # Staging validation script
├── MIGRATION_GUIDE.md                 # This guide
└── README.md                          # Quick reference
```
