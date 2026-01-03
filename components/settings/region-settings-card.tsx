'use client'

import { Card, CardContent } from "../ui/card"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Button } from "../ui/button"
import { CheckCircle2 } from "lucide-react"

export const RegionSettingsCard = () => {
  return (
    <>
      <Card>
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
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Button onClick={() => { }} className="flex-1" disabled={false}>
          {false ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Saved!
            </>
          ) : (
            "Save All Changes"
          )}
        </Button>
        <Button variant="outline" onClick={() => { }}>Cancel</Button>
      </div>
    </>
  )
}