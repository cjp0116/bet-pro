'use client'
import { PageLayout } from "@/components/page-header"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Bell, Lock, Shield, Eye, Globe, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const NotficationsSettingsCard = () => {
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

const PrivacySettingsCard = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <CardTitle>Privacy & Display</CardTitle>
        </div>
        <CardDescription>Control what information is visible</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Show Balance in Header</Label>
            <p className="text-sm text-muted-foreground">Display your account balance at the top of every page</p>
          </div>
          <Switch checked={false} onCheckedChange={() => { }} />
        </div>
        <Separator />
        <div className="space-y-2">
          <Label htmlFor="oddsFormat">Odds Format</Label>
          <Select defaultValue="american">
            <SelectTrigger id="oddsFormat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="american">American (-110, +150)</SelectItem>
              <SelectItem value="decimal">Decimal (1.91, 2.50)</SelectItem>
              <SelectItem value="fractional">Fractional (10/11, 3/2)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}

const SecuritySettingsCard = () => {
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

const ResponsibleGamingSettingsCard = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Responsible Gaming</CardTitle>
        </div>
        <CardDescription>Set limits to help manage your betting activity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="dailyLimit">Daily Deposit Limit</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input id="dailyLimit" type="number" placeholder="1000" className="pl-7" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="weeklyLimit">Weekly Deposit Limit</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input id="weeklyLimit" type="number" placeholder="5000" className="pl-7" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthlyLimit">Monthly Deposit Limit</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input id="monthlyLimit" type="number" placeholder="10000" className="pl-7" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sessionTime">Session Time Limit (hours)</Label>
          <Input id="sessionTime" type="number" placeholder="4" min="1" max="24" />
        </div>
        <Separator />
        <div className="space-y-2">
          <Button variant="outline" className="w-full bg-transparent">
            Take a Break (24 hours)
          </Button>
          <Button variant="outline" className="w-full bg-transparent">
            Self-Exclude (30 days)
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const RegionalSettingsCard = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle>Regional Settings</CardTitle>
        </div>
        <CardDescription>Customize your location preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select defaultValue="pst">
            <SelectTrigger id="timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pst">Pacific Time (PST)</SelectItem>
              <SelectItem value="mst">Mountain Time (MST)</SelectItem>
              <SelectItem value="cst">Central Time (CST)</SelectItem>
              <SelectItem value="est">Eastern Time (EST)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select defaultValue="en">
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  return (
    <PageLayout title="Settings">
      <div className="space-y-6">
        <NotficationsSettingsCard />
        <SecuritySettingsCard />
        <ResponsibleGamingSettingsCard />
        <PrivacySettingsCard />
        <RegionalSettingsCard />
        

        <div className="flex gap-3">
          <Button onClick={() => {}} className="flex-1" disabled={false}>
            {false ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Saved!
              </>
            ) : (
              "Save All Changes"
            )}
          </Button>
          <Button variant="outline" onClick={() => {}}>Cancel</Button>
        </div>
      </div>
    </PageLayout>
  )
}