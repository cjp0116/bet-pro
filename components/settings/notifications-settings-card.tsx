'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card"
import { Label } from "../ui/label"
import { Switch } from "../ui/switch"
import { Separator } from "../ui/separator"
import { Bell } from "lucide-react"

export const NotificationsSettingsCard = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle>Notifications</CardTitle>
        </div>
        <CardDescription>Manage how you receive notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Email Notifications</Label>
            <p className="text-sm text-muted-foreground">Receive bet updates and account notifications via email</p>
          </div>
          <Switch checked={false} onCheckedChange={() => { }} />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Push Notifications</Label>
            <p className="text-sm text-muted-foreground">Get real-time updates on your bets</p>
          </div>
          <Switch checked={false} onCheckedChange={() => { }} />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Promotional Offers</Label>
            <p className="text-sm text-muted-foreground">Receive updates about bonuses and promotions</p>
          </div>
          <Switch checked={false} onCheckedChange={() => { }} />
        </div>
      </CardContent>
    </Card>
  )
}