/**
 * Server-only notification database operations
 * 
 * DO NOT import this file in client components!
 * Use lib/notifications.ts for client-safe types and helpers.
 */
import 'server-only'

import { prisma } from '@/lib/db/prisma'
import type { NotificationType, NotificationPriority } from './notifications'

// ============================================
// Notification Service - Database Operations
// ============================================

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  priority?: NotificationPriority
  title: string
  message: string
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, unknown>
}

/**
 * Create a notification in the database
 */
export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      priority: input.priority || 'normal',
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
      actionLabel: input.actionLabel,
      metadata: input.metadata,
    },
  })
}

/**
 * Create a bet placed notification
 */
export async function notifyBetPlaced(
  userId: string,
  betId: string,
  stake: number,
  potentialPayout: number,
  betType: 'single' | 'parlay',
  selectionsCount: number
) {
  const betLabel = betType === 'parlay'
    ? `${selectionsCount}-leg parlay`
    : selectionsCount > 1
      ? `${selectionsCount} bets`
      : 'bet'

  return createNotification({
    userId,
    type: 'bet_placed',
    priority: 'normal',
    title: 'Bet Placed Successfully',
    message: `Your ${betLabel} for $${stake.toFixed(2)} is confirmed. Potential payout: $${potentialPayout.toFixed(2)}`,
    actionUrl: `/my-bets?id=${betId}`,
    actionLabel: 'Track Bet',
    metadata: {
      betId,
      stake,
      potentialPayout,
      betType,
      selectionsCount,
    },
  })
}

/**
 * Create a bet won notification
 */
export async function notifyBetWon(
  userId: string,
  betId: string,
  payout: number,
  betDescription: string
) {
  return createNotification({
    userId,
    type: 'bet_won',
    priority: 'high',
    title: 'Bet Won!',
    message: `${betDescription} won! +$${payout.toFixed(2)}`,
    actionUrl: `/my-bets?id=${betId}`,
    actionLabel: 'View Bet',
    metadata: {
      betId,
      amount: payout,
    },
  })
}

/**
 * Create a bet lost notification
 */
export async function notifyBetLost(
  userId: string,
  betId: string,
  betDescription: string
) {
  return createNotification({
    userId,
    type: 'bet_lost',
    priority: 'normal',
    title: 'Bet Settled',
    message: `${betDescription} did not win.`,
    actionUrl: `/my-bets?id=${betId}`,
    actionLabel: 'View Details',
    metadata: {
      betId,
    },
  })
}

/**
 * Get user notifications
 */
export async function getUserNotifications(
  userId: string,
  options?: {
    limit?: number
    includeRead?: boolean
    includeDismissed?: boolean
  }
) {
  const { limit = 50, includeRead = true, includeDismissed = false } = options || {}

  return prisma.notification.findMany({
    where: {
      userId,
      ...(includeRead ? {} : { read: false }),
      ...(includeDismissed ? {} : { dismissed: false }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true, readAt: new Date() },
  })
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, readAt: new Date() },
  })
}

/**
 * Dismiss a notification
 */
export async function dismissNotification(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { dismissed: true },
  })
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false, dismissed: false },
  })
}

