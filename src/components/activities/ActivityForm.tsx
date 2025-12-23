import React, { useState } from 'react'
import { activityAPI } from '@/services/api'

interface ActivityFormProps {
  onSuccess: () => void
}

export const ActivityForm: React.FC<ActivityFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [target, setTarget] = useState('1')
  const [unit, setUnit] = useState('kali')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await activityAPI.createActivity(name, category, parseInt(target), unit)
      setName('')
      setCategory('')
      setTarget('1')
      setUnit('kali')
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal membuat aktivitas')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="activity-form">
      <div>
        <label>Nama Aktivitas</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Kategori</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Target</label>
        <input
          type="number"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          min="1"
        />
      </div>
      <div>
        <label>Unit</label>
        <input
          type="text"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
      </div>
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={isLoading} className="btn-primary">
        {isLoading ? 'Loading...' : 'Simpan'}
      </button>
    </form>
  )
}
