import React from 'react'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { TodayChecklist } from '@/components/dashboard/TodayChecklist'

export const DashboardPage: React.FC = () => {
  return (
    <div className="dashboard-page">
      <Dashboard />
      <TodayChecklist />
    </div>
  )
}
