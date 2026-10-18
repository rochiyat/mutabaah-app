import React from 'react'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { TodayChecklist } from '@/components/dashboard/TodayChecklist'
import { InstallPrompt } from '@/components/layout/InstallPrompt'

export const DashboardPage: React.FC = () => {
  return (
    <div className="dashboard-page">
      <InstallPrompt />
      <Dashboard />
      <TodayChecklist />
    </div>
  )
}
