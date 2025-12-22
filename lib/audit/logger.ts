/**
 * Audit Logging System for Compliance
 * 
 * Comprehensive audit trail for all system actions
 */

import prisma from '../db/prisma'
import { hash } from '../security/encryption'

export type EntityType =
  | 'user'
  | 'bet'
  | 'transaction'
  | 'account'
  | 'payment_method'
  | 'deposit'
  | 'withdrawal'
  | 'fraud_event'
  | 'consent'
  | 'session'

export type AuditAction = 'create' | 'update' | 'delete' | 'view' | 'export' | 'login' | 'logout'

export interface AuditLogData {
  entityType: EntityType
  entityId: string
  action: AuditAction
  userId?: string
  ipAddress?: string
  changes?: {
    before?: any
    after?: any
  }
}

/**
 * Create audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  const ipAddressHash = data.ipAddress ? hash(data.ipAddress) : null

  await prisma.auditLog.create({
    data: {
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      userId: data.userId,
      ipAddressHash,
      changes: data.changes ? JSON.parse(JSON.stringify(data.changes)) : null
    }
  })
}

/**
 * Log user action
 */
export async function logUserAction(
  action: AuditAction,
  userId: string,
  entityType: EntityType,
  entityId: string,
  ipAddress?: string,
  changes?: { before?: any; after?: any }
): Promise<void> {
  await createAuditLog({
    entityType,
    entityId,
    action,
    userId,
    ipAddress,
    changes
  })
}

/**
 * Log system action (no user)
 */
export async function logSystemAction(
  action: AuditAction,
  entityType: EntityType,
  entityId: string,
  ipAddress?: string,
  changes?: { before?: any; after?: any }
): Promise<void> {
  await createAuditLog({
    entityType,
    entityId,
    action,
    ipAddress,
    changes
  })
}

/**
 * Log account activity
 */
export async function logAccountActivity(
  userId: string,
  activityType: string,
  ipAddress?: string,
  deviceFingerprint?: string,
  country?: string,
  region?: string,
  city?: string,
  userAgent?: string,
  success: boolean = true,
  metadata?: Record<string, any>
): Promise<void> {
  const ipAddressHash = ipAddress ? hash(ipAddress) : undefined

  await prisma.accountActivityLog.create({
    data: {
      userId,
      activityType,
      ipAddressHash: ipAddressHash || '',
      deviceFingerprint,
      country,
      region,
      city,
      userAgent,
      success,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
    }
  })
}

/**
 * Get audit logs for an entity
 */
export async function getAuditLogs(
  entityType: EntityType,
  entityId: string,
  limit: number = 100
) {
  return prisma.auditLog.findMany({
    where: {
      entityType,
      entityId
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true
        }
      }
    }
  })
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 100
) {
  return prisma.auditLog.findMany({
    where: {
      userId
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit
  })
}

/**
 * Get recent audit logs
 */
export async function getRecentAuditLogs(
  limit: number = 100,
  entityType?: EntityType
) {
  return prisma.auditLog.findMany({
    where: entityType ? { entityType } : undefined,
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true
        }
      }
    }
  })
}

