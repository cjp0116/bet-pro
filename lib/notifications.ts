// Client-safe notification types, helpers, and mock data
// Server-only database operations are in ./notifications-server.ts

export type NotificationType =
  | 'bet_placed'
  | 'bet_won'
  | 'bet_lost'
  | 'bet_pending'
  | 'deposit'
  | 'withdrawal'
  | 'promotion'
  | 'account'
  | 'system'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Notification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  timestamp: string
  read: boolean
  dismissed: boolean
  actionUrl?: string
  actionLabel?: string
  metadata?: {
    betId?: string
    transactionId?: string
    amount?: number
    [key: string]: any
  }
}

// Mock notification data (for demo/fallback)
export const notifications: Notification[] = [
  {
    id: "notif-001",
    type: "bet_won",
    priority: "high",
    title: "Bet Won!",
    message: "Your 3-leg parlay on NFL games won! +$275.00",
    timestamp: "2024-12-22T18:30:00Z",
    read: false,
    dismissed: false,
    actionUrl: "/my-bets?id=bet-005",
    actionLabel: "View Bet",
    metadata: {
      betId: "bet-005",
      amount: 275,
    },
  },
  {
    id: "notif-002",
    type: "deposit",
    priority: "normal",
    title: "Deposit Successful",
    message: "Your deposit of $500.00 via Visa has been processed.",
    timestamp: "2024-12-22T14:30:00Z",
    read: false,
    dismissed: false,
    actionUrl: "/transactions?id=txn-001",
    actionLabel: "View Transaction",
    metadata: {
      transactionId: "txn-001",
      amount: 500,
    },
  },
  {
    id: "notif-003",
    type: "promotion",
    priority: "normal",
    title: "New Bonus Available!",
    message: "Get a 50% deposit match up to $200. Deposit now to claim!",
    timestamp: "2024-12-22T10:00:00Z",
    read: false,
    dismissed: false,
    actionUrl: "/deposit",
    actionLabel: "Deposit Now",
  },
  {
    id: "notif-004",
    type: "bet_lost",
    priority: "normal",
    title: "Bet Settled",
    message: "Your bet on Warriors -4.5 vs Suns did not win.",
    timestamp: "2024-12-21T23:30:00Z",
    read: true,
    dismissed: false,
    actionUrl: "/my-bets?id=bet-004",
    actionLabel: "View Details",
    metadata: {
      betId: "bet-004",
    },
  },
  {
    id: "notif-005",
    type: "withdrawal",
    priority: "normal",
    title: "Withdrawal Processing",
    message: "Your withdrawal of $150.00 is being processed. Est. 2-3 business days.",
    timestamp: "2024-12-21T16:20:00Z",
    read: true,
    dismissed: false,
    actionUrl: "/transactions?id=txn-009",
    actionLabel: "View Status",
    metadata: {
      transactionId: "txn-009",
      amount: 150,
    },
  },
  {
    id: "notif-006",
    type: "bet_pending",
    priority: "low",
    title: "Bet Placed",
    message: "Your bet on Chiefs -3.5 is confirmed and pending.",
    timestamp: "2024-12-21T15:30:00Z",
    read: true,
    dismissed: false,
    actionUrl: "/my-bets?id=bet-001",
    actionLabel: "Track Bet",
    metadata: {
      betId: "bet-001",
    },
  },
  {
    id: "notif-007",
    type: "account",
    priority: "high",
    title: "Verify Your Account",
    message: "Complete identity verification to increase your withdrawal limits.",
    timestamp: "2024-12-20T09:00:00Z",
    read: true,
    dismissed: false,
    actionUrl: "/account?tab=verification",
    actionLabel: "Verify Now",
  },
  {
    id: "notif-008",
    type: "system",
    priority: "normal",
    title: "Scheduled Maintenance",
    message: "BetPro will undergo maintenance on Dec 25th from 2-4 AM EST.",
    timestamp: "2024-12-19T12:00:00Z",
    read: true,
    dismissed: true,
  },
]

export function getUnreadCount(notifications: Notification[]): number {
  return notifications.filter(n => !n.read && !n.dismissed).length
}

// Helper function to format relative time
export function getRelativeTime(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// Notification type to icon mapping
export const notificationIcons = {
  bet_placed: "check-circle",
  bet_won: "trophy",
  bet_lost: "x-circle",
  bet_pending: "clock",
  deposit: "arrow-down-circle",
  withdrawal: "arrow-up-circle",
  promotion: "gift",
  account: "user",
  system: "bell",
} as const

// Notification type to color mapping
export const notificationColors = {
  bet_placed: "text-green-500",
  bet_won: "text-green-500",
  bet_lost: "text-red-500",
  bet_pending: "text-yellow-500",
  deposit: "text-blue-500",
  withdrawal: "text-purple-500",
  promotion: "text-primary",
  account: "text-orange-500",
  system: "text-muted-foreground",
} as const
