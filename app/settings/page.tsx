'use client'

import { PageLayout } from "@/components/page-header"
import { ResponsibleGamingSettingsCard } from '@/components/settings/responsible-gaming-card'
import { PrivacySettingsCard } from '@/components/settings/privacy-settings-card'
import { SecuritySettingsCard } from '@/components/settings/security-settings-card'
import { RegionSettingsCard } from '@/components/settings/region-settings-card'
import { NotificationsSettingsCard } from '@/components/settings/notifications-settings-card';
import { CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <PageLayout title="Settings">
      <div className="space-y-6">
        <NotificationsSettingsCard />
        <SecuritySettingsCard />
        <ResponsibleGamingSettingsCard />
        <PrivacySettingsCard />
        <RegionSettingsCard />
      </div>
    </PageLayout>
  )
}