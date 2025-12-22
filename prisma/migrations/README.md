# Database Migrations

## Setup

1. Create a PostgreSQL database
2. Set `DATABASE_URL` in your `.env` file:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/bet_pro?schema=public"
   ```
3. Run migrations:
   ```bash
   npm run db:migrate
   ```

## Migration Commands

- `npm run db:generate` - Generate Prisma Client
- `npm run db:migrate` - Create and apply migrations (development)
- `npm run db:migrate:deploy` - Apply migrations (production)
- `npm run db:studio` - Open Prisma Studio to view/edit data

## Important Notes

- **Encryption Key**: Set `ENCRYPTION_KEY` environment variable (64-character hex string)
- **Partitioning**: For production, consider partitioning large tables (`transactions`, `account_activity_log`, `audit_logs`) by date
- **Indexes**: All critical indexes are defined in the schema
- **Backups**: Set up regular database backups before running in production

## Partitioning Strategy (PostgreSQL)

For high-volume tables, consider partitioning:

```sql
-- Example: Partition transactions table by month
CREATE TABLE transactions (
  -- columns
) PARTITION BY RANGE (created_at);

CREATE TABLE transactions_2024_01 PARTITION OF transactions
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

Apply similar partitioning to:
- `account_activity_log` (partition by `created_at`)
- `audit_logs` (partition by `created_at`)

