# Sports Betting Database Implementation

## Overview

This database implementation provides a comprehensive, secure, and GDPR-compliant foundation for a sports betting application using PostgreSQL and Prisma ORM.

## Features

### Security
- **Password Hashing**: bcrypt/argon2 with password strength validation
- **Two-Factor Authentication**: Support for TOTP, SMS, and Email 2FA
- **Encryption**: AES-256-GCM for sensitive data (payment methods, addresses, etc.)
- **Session Management**: Secure session tokens with device tracking
- **Device Fingerprinting**: Track and identify devices for fraud prevention

### Fraud Detection
- **Pattern Recognition**: Detects rapid betting, unusual stake sizes, arbitrage, account takeover
- **Risk Scoring**: Calculates risk scores based on user behavior and patterns
- **Activity Monitoring**: Comprehensive logging of all account activities
- **IP Tracking**: Track and score IP addresses for suspicious activity

### GDPR Compliance
- **Consent Management**: Track and manage user consents for different data types
- **Data Export**: Export all user data in JSON or CSV format
- **Data Deletion**: Anonymize or delete user data on request
- **Audit Logging**: Complete audit trail for compliance

### Financial
- **Account Management**: Multiple account types (main, bonus, free bet)
- **Transaction Tracking**: Complete transaction history with balance tracking
- **Payment Methods**: Secure, tokenized payment method storage (PCI compliant)
- **Deposits/Withdrawals**: Full tracking of financial transactions

## Database Schema

### Core Tables

#### User & Authentication
- `users` - Core user information
- `user_profiles` - Extended user profile (GDPR separated)
- `user_passwords` - Password hashes and reset tokens
- `two_factor_auth` - 2FA configuration
- `user_sessions` - Active user sessions
- `login_attempts` - Login attempt tracking

#### Betting
- `sports` - Sports catalog
- `leagues` - Leagues by sport
- `teams` - Teams by league
- `games` - Game/match information
- `bet_markets` - Betting markets (moneyline, spread, etc.)
- `bet_selections` - Individual selections with odds
- `bets` - User bets (single, parlay, system)
- `bet_selections_bets` - Junction table for bet selections

#### Financial
- `accounts` - User accounts (main, bonus, etc.)
- `transactions` - All financial transactions
- `payment_methods` - Tokenized payment methods
- `deposits` - Deposit transactions
- `withdrawals` - Withdrawal transactions

#### Fraud Detection
- `fraud_events` - Fraud event records
- `betting_patterns` - Detected betting patterns
- `account_activity_log` - Comprehensive activity logging
- `device_registry` - Registered devices
- `ip_addresses` - IP address tracking

#### Compliance
- `audit_logs` - System audit trail
- `gdpr_consents` - Consent tracking
- `data_deletion_requests` - Deletion request tracking
- `data_export_requests` - Export request tracking
- `security_alerts` - Security alerts

#### Promotions
- `promotions` - Promotion definitions
- `user_bonuses` - User bonus tracking

## Usage

### Prisma Client

```typescript
import prisma from '@/lib/db/prisma'

// Example: Create a user
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    emailVerified: false,
    // ...
  }
})
```

### Security Utilities

```typescript
import { encrypt, decrypt, hash } from '@/lib/security'
import { hashPassword, verifyPassword } from '@/lib/security'

// Encrypt sensitive data
const encrypted = encrypt('sensitive data')
const decrypted = decrypt(encrypted)

// Hash passwords
const passwordHash = await hashPassword('user password')
const isValid = await verifyPassword('user password', passwordHash)

// Hash IP addresses
const ipHash = hash('192.168.1.1')
```

### Fraud Detection

```typescript
import { detectRapidBetting, calculateRiskScore } from '@/lib/fraud'
import { calculateBaseRiskScore } from '@/lib/fraud/risk-scorer'

// Detect rapid betting pattern
const pattern = detectRapidBetting(bets, 5, 10) // 10 bets in 5 minutes

// Calculate risk score
const riskScore = calculateBaseRiskScore({
  accountAge: 7,
  emailVerified: true,
  kycVerified: false,
  // ...
})
```

### GDPR Utilities

```typescript
import { exportUserData, createExportRequest } from '@/lib/gdpr/export'
import { deleteUserData, createDeletionRequest } from '@/lib/gdpr/deletion'
import { hasConsent } from '@/lib/gdpr/consent'

// Export user data
const data = await exportUserData(userId, 'json')

// Delete user data
await deleteUserData(userId)

// Check consent
const hasMarketingConsent = hasConsent(consents, 'marketing')
```

### Audit Logging

```typescript
import { logUserAction, logAccountActivity } from '@/lib/audit/logger'

// Log user action
await logUserAction('update', userId, 'user', userId, ipAddress, {
  before: oldData,
  after: newData
})

// Log account activity
await logAccountActivity(
  userId,
  'login',
  ipAddress,
  deviceFingerprint,
  country,
  region,
  city,
  userAgent,
  true
)
```

## Environment Variables

```env
# Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/bet_pro?schema=public"

# Encryption key (64-character hex string)
ENCRYPTION_KEY="your-64-character-hex-encryption-key-here"

# Node environment
NODE_ENV="development"
```

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up database**:
   - Create PostgreSQL database
   - Set `DATABASE_URL` in `.env`
   - Generate encryption key: `openssl rand -hex 32`

3. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

4. **Generate Prisma Client**:
   ```bash
   npm run db:generate
   ```

## Security Best Practices

1. **Encryption Key Management**: Use AWS KMS, HashiCorp Vault, or similar for production
2. **Password Policy**: Enforce minimum 12 characters with complexity requirements
3. **2FA**: Require 2FA for withdrawals, optional for deposits
4. **Rate Limiting**: Implement rate limiting for login attempts, API calls, bet placement
5. **Session Management**: Use short-lived access tokens, longer refresh tokens
6. **Input Validation**: Validate and sanitize all inputs
7. **PCI Compliance**: Never store full card numbers, use tokenization
8. **Regular Audits**: Perform automated security scans and penetration testing

## Performance Considerations

### Indexing
All critical indexes are defined in the schema:
- User lookups by email
- Bet queries by user, status, and date
- Transaction queries by user and date
- Fraud event queries by user and date
- Activity log queries by user and timestamp

### Partitioning
For high-volume tables, consider partitioning:
- `transactions` - Partition by `created_at` (monthly)
- `account_activity_log` - Partition by `created_at` (monthly)
- `audit_logs` - Partition by `created_at` (monthly)

### Connection Pooling
Use PgBouncer or similar for connection pooling in production.

## GDPR Compliance

### Data Retention
- Transaction data: 7 years (legal requirement)
- Activity logs: 2 years
- Audit logs: 7 years
- Deleted user data: Anonymized after 30 days

### User Rights
- **Right to Access**: Use `exportUserData()` to export all user data
- **Right to Deletion**: Use `deleteUserData()` to anonymize/delete data
- **Right to Rectification**: Update user data through Prisma
- **Consent Management**: Track and manage consents with GDPR consent utilities

## Migration Commands

- `npm run db:generate` - Generate Prisma Client
- `npm run db:migrate` - Create and apply migrations (development)
- `npm run db:migrate:deploy` - Apply migrations (production)
- `npm run db:studio` - Open Prisma Studio to view/edit data

## Next Steps

1. Set up database and run migrations
2. Configure encryption key management
3. Implement API endpoints using the utilities
4. Set up monitoring and alerting
5. Configure database backups
6. Set up connection pooling
7. Implement rate limiting
8. Set up fraud detection monitoring dashboard

