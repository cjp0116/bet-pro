# NextAuth Models Migration - Data Preservation Scripts

This directory contains scripts to safely migrate data when applying the `20251224134949_add_nextauth_models` migration.

## Files Overview

### Core Migration Scripts

1. **`pre-migration-data-backup.sql`** - Backup script using temp tables (requires same session)
2. **`post-migration-data-restore.sql`** - Restore script for temp tables
3. **`pre-migration-data-backup-persistent.sql`** - Backup script using persistent tables
4. **`post-migration-data-restore-persistent.sql`** - Restore script for persistent tables

### Testing & Documentation

5. **`test-migration.sql`** - Validation script to test migration on staging
6. **`MIGRATION_GUIDE.md`** - Complete migration guide with instructions
7. **`README.md`** - This file

## Quick Start

1. **Read the guide**: `MIGRATION_GUIDE.md`
2. **Test first**: Run `test-migration.sql` on staging
3. **Backup**: Run pre-migration script
4. **Migrate**: Apply Prisma migration
5. **Restore**: Run post-migration script
6. **Verify**: Check data integrity

## What Gets Migrated

- **`users.emailVerified`**: BOOLEAN → TIMESTAMP(3)

  - `true` → user's `createdAt` timestamp
  - `false` → `NULL`

- **`accounts` → `financial_accounts`**: Direct 1:1 mapping
  - All columns preserved
  - All IDs preserved
  - All foreign keys maintained

## Safety Features

- ✅ Transaction-wrapped operations
- ✅ Data integrity validation
- ✅ Foreign key verification
- ✅ Balance reconciliation
- ✅ Comprehensive error handling
- ✅ Rollback support via database backup

## Important Notes

- **Always backup** your database before running migrations
- **Test on staging** first using `test-migration.sql`
- **Choose the right version**: temp tables (same session) vs persistent (separate sessions)
- **Verify** data integrity after migration
