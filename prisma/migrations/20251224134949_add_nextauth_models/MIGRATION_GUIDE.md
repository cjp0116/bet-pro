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

## Prerequisites

1. **Database Backup**: Export a full database backup before proceeding

   ```bash
   pg_dump -h localhost -U your_user -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Staging Test**: Test the entire migration process on a staging snapshot first

3. **Maintenance Window**: Schedule a maintenance window for production

## Migration Steps

### Choose Your Approach

**Option A: Temp Tables (Same Session Required)**

- Use `pre-migration-data-backup.sql` and `post-migration-data-restore.sql`
- Faster, automatic cleanup
- **Requires**: Backup and restore in the same database session

**Option B: Persistent Tables (Separate Sessions OK)**

- Use `pre-migration-data-backup-persistent.sql` and `post-migration-data-restore-persistent.sql`
- Can run backup and restore in separate sessions
- **Requires**: Manual cleanup of backup tables after verification

### Step 1: Pre-Migration Backup

#### Option A: Temp Tables (Same Session)

Run the pre-migration backup script **in the same database session** where you'll run the restore:

```bash
psql -h localhost -U your_user -d your_database -f pre-migration-data-backup.sql
```

**Important**: Keep the database connection open after running this script.

#### Option B: Persistent Tables (Separate Sessions)

Run the persistent backup script:

```bash
psql -h localhost -U your_user -d your_database -f pre-migration-data-backup-persistent.sql
```

This creates permanent backup tables that persist across sessions.

Both scripts:

- Back up `users.emailVerified` (converts BOOLEAN to TIMESTAMP)
- Back up all `accounts` table data
- Validate data integrity

### Step 2: Apply Schema Migration

Apply the main Prisma migration:

```bash
npx prisma migrate deploy
# OR
npx prisma migrate resolve --applied 20251224134949_add_nextauth_models
```

### Step 3: Post-Migration Restore

#### Option A: Temp Tables (Same Session)

**Immediately after** the schema migration, in the **same database session**, run:

```bash
psql -h localhost -U your_user -d your_database -f post-migration-data-restore.sql
```

#### Option B: Persistent Tables (Separate Sessions)

After the schema migration, run:

```bash
psql -h localhost -U your_user -d your_database -f post-migration-data-restore-persistent.sql
```

**After verification**, manually clean up backup tables:

```sql
DROP TABLE IF EXISTS _migration_emailverified_backup;
DROP TABLE IF EXISTS _migration_accounts_backup;
```

Both scripts:

- Restore `emailVerified` values (converted to TIMESTAMP)
- Migrate `accounts` data to `financial_accounts`
- Validate data integrity

### Step 4: Verification

Run these verification queries:

```sql
-- Verify emailVerified restoration
SELECT
    COUNT(*) as users_with_verified_email,
    COUNT(*) FILTER (WHERE "emailVerified" IS NOT NULL) as verified_count
FROM users;

-- Verify account migration
SELECT
    COUNT(*) as financial_accounts_count,
    SUM(balance) as total_balance
FROM financial_accounts;

-- Verify transaction foreign keys
SELECT COUNT(*) as orphaned_transactions
FROM transactions t
WHERE NOT EXISTS (
    SELECT 1 FROM financial_accounts fa WHERE fa.id = t."accountId"
);
```

## Data Transformation Rules

### emailVerified Conversion

- **BOOLEAN `true`** → **TIMESTAMP** (user's `createdAt` or current timestamp)
- **BOOLEAN `false`** → **NULL**

### Accounts Migration

The `accounts` table maps directly to `financial_accounts`:

- All columns map 1:1
- All IDs are preserved
- All foreign key relationships are maintained

## Rollback Plan

If the migration fails:

1. **DO NOT** drop the temporary backup tables
2. Restore from database backup
3. Investigate the failure
4. Fix issues and retry

## Testing Checklist

Before production:

- [ ] Run `test-migration.sql` on staging snapshot
- [ ] Test full migration process on staging
- [ ] Verify all `emailVerified` values restored correctly
- [ ] Verify all accounts migrated to `financial_accounts`
- [ ] Verify transaction foreign keys intact
- [ ] Verify no orphaned records
- [ ] Verify balance totals match
- [ ] Test application functionality
- [ ] Export production backup

## Production Deployment

1. **Export backup**: `pg_dump > backup.sql`
2. **Run pre-migration backup**: `pre-migration-data-backup.sql`
3. **Apply schema migration**: `npx prisma migrate deploy`
4. **Run post-migration restore**: `post-migration-data-restore.sql`
5. **Verify data integrity**: Run verification queries
6. **Test application**: Verify critical paths work
7. **Monitor**: Watch for errors in logs

## Troubleshooting

### Temp Tables Not Found

If you see "relation does not exist" errors:

- You must run pre-migration and post-migration scripts in the **same database session**
- Temp tables are session-scoped in PostgreSQL

### Data Count Mismatch

If verification shows count mismatches:

- Check for constraint violations
- Check for duplicate IDs
- Review migration logs

### Balance Mismatch

If balances don't match:

- Check for rounding issues (tolerance: 0.01)
- Verify all accounts were migrated
- Check for NULL values

## Support

If you encounter issues:

1. Check migration logs
2. Review verification queries
3. Restore from backup if needed
4. Contact database administrator
