# NextAuth Models Migration - Data Preservation Scripts

This directory contains scripts to safely migrate data when applying the `20251224134949_add_nextauth_models` migration.

## Files Overview

### Core Migration Scripts

| #   | File                              | Description                                             |
| --- | --------------------------------- | ------------------------------------------------------- |
| 1   | `pre-migration-data-backup.sql`   | Creates backup tables + `migration_backups` audit table |
| 2   | `migration.sql`                   | Prisma-generated schema migration                       |
| 3   | `post-migration-data-restore.sql` | Restores data with idempotency + FK validation          |
| 4   | `post-migration-cleanup.sql`      | Drops backup tables after verification                  |

### Alternative Scripts (Persistent Tables)

| File                                         | Description                                           |
| -------------------------------------------- | ----------------------------------------------------- |
| `pre-migration-data-backup-persistent.sql`   | Backup using persistent tables (separate sessions OK) |
| `post-migration-data-restore-persistent.sql` | Restore for persistent tables                         |

### Testing & Documentation

| File                 | Description                   |
| -------------------- | ----------------------------- |
| `test-migration.sql` | Validation script for staging |
| `MIGRATION_GUIDE.md` | **Complete migration guide**  |
| `README.md`          | This file                     |

## Quick Start

```bash
# 1. Backup database
pg_dump -h localhost -U user -d database > backup_$(date +%Y%m%d).sql

# 2. Run pre-migration backup
psql -f pre-migration-data-backup.sql

# 3. Apply Prisma migration
npx prisma migrate deploy

# 4. Run post-migration restore
psql -f post-migration-data-restore.sql

# 5. Verify (run queries in MIGRATION_GUIDE.md)

# 6. Cleanup
psql -f post-migration-cleanup.sql
```

## Workflow Diagram

```
BACKUP ──▶ MIGRATE ──▶ RESTORE ──▶ VERIFY ──▶ CLEANUP
  │                        │          │
  ▼                        ▼          ▼
audit                   validate    fail-safe
table                   checksums   checks
```

## What Gets Migrated

- **`users.emailVerified`**: BOOLEAN → TIMESTAMP(3)

  - `true` → user's `createdAt` timestamp
  - `false` → `NULL`

- **`accounts` → `financial_accounts`**: Direct 1:1 mapping
  - All columns preserved
  - All IDs preserved
  - All foreign keys maintained

## Audit Trail

The `migration_backups` table provides a permanent audit trail:

```sql
SELECT source_table, row_count, checksum_value, total_balance, status
FROM migration_backups
WHERE migration_name = '20251224134949_add_nextauth_models';
```

## Safety Features

- ✅ Transaction-wrapped operations
- ✅ Idempotent scripts (safe to re-run)
- ✅ Checksum verification
- ✅ Balance reconciliation
- ✅ Foreign key validation
- ✅ Fail-safe checks before cleanup
- ✅ Comprehensive audit trail
- ✅ Rollback support via database backup

## Important Notes

- **Always backup** your database before running migrations
- **Test on staging** first using `test-migration.sql`
- **Verify** data integrity before running cleanup
- The `migration_backups` table is retained permanently for audit compliance

## Full Documentation

See **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** for complete instructions.
