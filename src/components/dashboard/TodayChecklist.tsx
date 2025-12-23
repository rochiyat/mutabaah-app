import React, { useState, useEffect } from 'react'
import { Activity, Record } from '@/types'
import { activityAPI, recordAPI } from '@/services/api'

export const TodayChecklist: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [records, setRecords] = useState<Record[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [activitiesRes, recordsRes] = await Promise.all([
          activityAPI.getActivities(),
          recordAPI.getRecords()
        ])
        setActivities(activitiesRes.data.filter(a => a.isActive))
        setRecords(recordsRes.data)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleRecordUpdate = async (activityId: number, completed: number) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const existingRecord = records.find(r => r.activityId === activityId && r.date.startsWith(today))
      
      if (existingRecord) {
        await recordAPI.updateRecord(existingRecord.id, { completed })
      } else {
        await recordAPI.createRecord(activityId, completed, '', today)
      }
      
      const recordsRes = await recordAPI.getRecords()
      setRecords(recordsRes.data)
    } catch (error) {
      console.error('Failed to update record:', error)
    }
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="today-checklist">
      <h2>Checklist Hari Ini</h2>
      {activities.map(activity => {
        const today = new Date().toISOString().split('T')[0]
        const todayRecord = records.find(r => r.activityId === activity.id && r.date.startsWith(today))
        
        return (
          <div key={activity.id} className="checklist-item">
            <h3>{activity.name}</h3>
            <input
              type="number"
              min="0"
              value={todayRecord?.completed || 0}
              onChange={(e) => handleRecordUpdate(activity.id, parseInt(e.target.value))}
              max={activity.target}
            />
            <span>/ {activity.target} {activity.unit}</span>
          </div>
        )
      })}
    </div>
  )
}
