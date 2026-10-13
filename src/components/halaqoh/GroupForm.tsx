import React, { useState } from 'react'
import type { Group, GroupInput } from '@/types'
import { getErrorMessage } from '@/utils/labels'

interface GroupFormProps {
  initial?: Group
  submitLabel: string
  onSubmit: (data: GroupInput) => Promise<void>
  onCancel?: () => void
}

export const GroupForm: React.FC<GroupFormProps> = ({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}) => {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [level, setLevel] = useState(initial?.level ?? '')
  const [schedule, setSchedule] = useState(initial?.schedule ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await onSubmit({
        name,
        description: description || null,
        level: level || null,
        schedule: schedule || null,
        location: location || null,
        ...(initial ? { isActive } : {}),
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menyimpan halaqoh'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="activity-form form-grid">
      <div className="span-2">
        <label>Nama Halaqoh</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label>Jenjang</label>
        <input
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          placeholder="mis. Pemula"
        />
      </div>
      <div>
        <label>Jadwal</label>
        <input
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          placeholder="mis. Ahad 08.00"
        />
      </div>
      <div className="span-2">
        <label>Tempat / Link</label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="mis. Masjid Al-Ikhlas atau link Zoom"
        />
      </div>
      <div className="span-2">
        <label>Keterangan</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      {initial && (
        <label className="checkbox span-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Halaqoh aktif
        </label>
      )}
      {error && <div className="error span-2">{error}</div>}
      <div className="actions span-2">
        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading ? 'Menyimpan...' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Batal
          </button>
        )}
      </div>
    </form>
  )
}
