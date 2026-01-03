'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card"
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { Separator } from "../ui/separator"
import { Switch } from "../ui/switch"
import { Lock } from "lucide-react"

export const SecuritySettingsCard = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <CardTitle>Security</CardTitle>
        </div>
        <CardDescription>Keep your account secure</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input id="currentPassword" type="password" placeholder="Enter current password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input id="newPassword" type="password" placeholder="Enter new password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input id="confirmPassword" type="password" placeholder="Confirm new password" />
        </div>
        <Button variant="outline" className="w-full bg-transparent">
          Update Password
        </Button>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Two-Factor Authentication</Label>
            <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
          </div>
          <Switch checked={false} onCheckedChange={() => { }} />
        </div>
        <Button variant="outline" size="sm">
          Configure 2FA
        </Button>
      </CardContent>
    </Card>
  )
}
