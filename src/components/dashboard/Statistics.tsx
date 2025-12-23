import React, { useState, useEffect } from 'react'
import { statsAPI } from '@/services/api'
import { WeeklyStats, MonthlyStats } from '@/types'

export const Statistics: React.FC = () => {
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [weekly, monthly] = await Promise.all([
          statsAPI.getWeeklyStats(),
          statsAPI.getMonthlyStats()
        ])
        setWeeklyStats(weekly.data)
        setMonthlyStats(monthly.data)
      } catch (error) {
        console.error('Failed to fetch statistics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="statistics">
      <h2>Statistik</h2>
      
      <div className="stats-section">
        <h3>Mingguan</h3>
        {weeklyStats.map(stat => (
          <div key={stat.activityId} className="activity-stat">
            <h4>{stat.activityName}</h4>
            <div className="week-data">
              {stat.data.map((day, idx) => (
                <div key={idx} className="day">
                  <span className="date">{day.date}</span>
                  <span className="value">{day.completed}/{day.target}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="stats-section">
        <h3>Bulanan</h3>
        {monthlyStats.map(stat => (
          <div key={stat.activityId} className="activity-stat">
            <h4>{stat.activityName}</h4>
            <p>{stat.totalCompleted} / {stat.totalTarget} ({stat.percentage.toFixed(1)}%)</p>
          </div>
        ))}
      </div>
    </div>
  )
}
