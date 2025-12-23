import React, { useState, useEffect } from 'react'
import { statsAPI } from '@/services/api'
import { DashboardSummary } from '@/types'

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await statsAPI.getDashboardStats()
        setStats(response.data)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Hari Ini</h3>
            <p className="stat-value">
              {stats.todayCompleted} / {stats.todayTarget}
            </p>
          </div>
          <div className="stat-card">
            <h3>Streak</h3>
            <p className="stat-value">{stats.streak} hari</p>
          </div>
          <div className="stat-card">
            <h3>Total Aktivitas</h3>
            <p className="stat-value">{stats.totalActivities}</p>
          </div>
        </div>
      )}
    </div>
  )
}
