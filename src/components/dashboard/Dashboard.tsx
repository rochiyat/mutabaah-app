import React, { useState, useEffect } from 'react'
import { statsAPI } from '@/services/api'
import { DashboardSummary } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { Icon } from '@/components/ui/Icon'
import { dailyReminder, formatGregorian, formatHijri, greetingByHour } from '@/utils/islamic'

export const Dashboard: React.FC = () => {
  const { user } = useAuth()
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

  const now = new Date()
  const hijri = formatHijri(now)
  const reminder = dailyReminder(now)
  const firstName = user?.name.split(' ')[0] ?? ''

  return (
    <div className="dashboard">
      <section className="greeting-card">
        <div>
          <p className="greeting-salam">Assalamu'alaikum, {firstName} 👋</p>
          <h2>{greetingByHour(now.getHours())}, semangat beramal hari ini!</h2>
          <p className="greeting-date">
            {formatGregorian(now)}
            {hijri && <span className="hijri"> · {hijri}</span>}
          </p>
        </div>
        <blockquote className="reminder">
          <p>"{reminder.text}"</p>
          <cite>{reminder.source}</cite>
        </blockquote>
      </section>

      {isLoading && <div className="loading">Memuat ringkasan...</div>}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">
              <Icon name="check" />
            </span>
            <h3>Hari Ini</h3>
            <p className="stat-value">
              {stats.todayCompleted} / {stats.todayTarget}
            </p>
          </div>
          <div className="stat-card stat-card-gold">
            <span className="stat-icon">
              <Icon name="flame" />
            </span>
            <h3>Streak</h3>
            <p className="stat-value">{stats.streak} hari</p>
          </div>
          <div className="stat-card stat-card-soft">
            <span className="stat-icon">
              <Icon name="checklist" />
            </span>
            <h3>Total Aktivitas</h3>
            <p className="stat-value">{stats.totalActivities}</p>
          </div>
        </div>
      )}
    </div>
  )
}
