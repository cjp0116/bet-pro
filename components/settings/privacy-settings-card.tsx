'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card"
import { Label } from "../ui/label"
import { Switch } from "../ui/switch"
import { Separator } from "../ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Eye } from "lucide-react"

export const PrivacySettingsCard = () => {
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
