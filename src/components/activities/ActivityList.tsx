import React, { useState, useEffect } from 'react'
import { Activity } from '@/types'
import { activityAPI } from '@/services/api'
import { ActivityForm } from './ActivityForm'

export const ActivityList: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    try {
      const response = await activityAPI.getActivities()
      setActivities(response.data)
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Hapus aktivitas ini?')) {
      try {
        await activityAPI.deleteActivity(id)
        setActivities(activities.filter(a => a.id !== id))
      } catch (error) {
        console.error('Failed to delete activity:', error)
      }
    }
  }

  const handleActivityCreated = () => {
    setShowForm(false)
    fetchActivities()
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="activity-list">
      <h2>Aktivitas</h2>
      <button onClick={() => setShowForm(!showForm)} className="btn-primary">
        {showForm ? 'Batal' : 'Tambah Aktivitas'}
      </button>

      {showForm && <ActivityForm onSuccess={handleActivityCreated} />}

      <div className="activities">
        {activities.map(activity => (
          <div key={activity.id} className="activity-card">
            <h3>{activity.name}</h3>
            <p>Kategori: {activity.category}</p>
            <p>Target: {activity.target} {activity.unit}</p>
            <p>Status: {activity.isActive ? 'Aktif' : 'Tidak Aktif'}</p>
            <button onClick={() => handleDelete(activity.id)} className="btn-danger">
              Hapus
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
