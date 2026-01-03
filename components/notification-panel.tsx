'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bell,
  Trophy,
  XCircle,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  Gift,
  User,
  Check,
  X,
  Settings,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { type Notification, notifications as initialNotifications, getUnreadCount, getRelativeTime, notificationColors, notificationIcons } from '@/lib/notifications'
import { cn} from '@/lib/utils'

const iconMap = {
  trophy: Trophy,
  'x-circle': XCircle,
  clock: Clock,
  'arrow-down-circle': ArrowDownCircle,
  'arrow-up-circle': ArrowUpCircle,
  gift: Gift,
  user: User,
  bell: Bell
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onDismiss: (id: string) => void
}

export const NotificationPanel = () =>{
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [activeTab, setActiveTab] = useState('all')

  const unreadCount = getUnreadCount(notifications)

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed : true } : n))
  }

  const clearAll = () => {
    setNotifications(prev => prev.map(n => ({ ...n, dismissed: true })))
  }

  const filteredNotifications = notifications.filter((n) => {
    if (n.dismissed) return false
    if (activeTab === "all") return true
    if (activeTab === "unread") return !n.read
    return n.type === activeTab
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="h-8 text-xs"
            >
              <Check className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <Separator />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b px-4">
            <TabsList className="h-9 w-full justify-start rounded-none border-0 bg-transparent p-0">
              <TabsTrigger
                value="all"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Unread
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="bet_won"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Bets
              </TabsTrigger>
              <TabsTrigger
                value="promotion"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Promos
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[400px]">
            <TabsContent value={activeTab} className="m-0 p-0">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No notifications</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeTab === "unread" ? "You're all caught up!" : "New notifications will appear here"}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAllAsRead}
                      onDismiss={dismissNotification}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {filteredNotifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-muted-foreground hover:text-destructive"
                onClick={clearAll}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All Notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotificationItem({ notification, onMarkAsRead, onDismiss }: NotificationItemProps) {
  const IconComponent =
    iconMap[
    notification.type === "bet_won"
      ? "trophy"
      : notification.type === "bet_lost"
        ? "x-circle"
        : notification.type === "bet_pending"
          ? "clock"
          : notification.type === "deposit"
            ? "arrow-down-circle"
            : notification.type === "withdrawal"
              ? "arrow-up-circle"
              : notification.type === "promotion"
                ? "gift"
                : notification.type === "account"
                  ? "user"
                  : "bell"
    ]

  const colorClass = notificationColors[notification.type]

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
  }

  return (
    <div
      className={cn(
        "relative flex gap-3 p-4 transition-colors hover:bg-muted/50",
        !notification.read && "bg-primary/5",
      )}
      onClick={handleClick}
    >
      {!notification.read && (
        <div className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
      )}

      <div className={cn("mt-0.5", colorClass)}>
        <IconComponent className="h-5 w-5" />
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm font-medium", !notification.read && "font-semibold")}>{notification.title}</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 hover:bg-background"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss(notification.id)
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{notification.message}</p>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">{getRelativeTime(notification.timestamp)}</span>

          {notification.actionUrl && notification.actionLabel && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs font-medium"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={notification.actionUrl}>{notification.actionLabel} →</Link>
            </Button>
          )}
        </div>

        {notification.priority === "urgent" && (
          <Badge variant="destructive" className="mt-2 text-xs">
            Urgent
          </Badge>
        )}
      </div>
    </div>
  )
}
