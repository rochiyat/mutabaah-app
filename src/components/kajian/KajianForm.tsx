import React, { useState } from 'react'
import type { Kajian, KajianInput } from '@/types'
import { getErrorMessage } from '@/utils/labels'

interface KajianFormProps {
  initial?: Kajian
  submitLabel: string
  onSubmit: (data: KajianInput) => Promise<void>
  onCancel?: () => void
}

export const KajianForm: React.FC<KajianFormProps> = ({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}) => {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [speaker, setSpeaker] = useState(initial?.speaker ?? '')
  const [schedule, setSchedule] = useState(initial?.schedule ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await onSubmit({
        title,
        speaker: speaker || null,
        schedule: schedule || null,
        location: location || null,
        description: description || null,
        ...(initial ? { isActive } : {}),
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menyimpan kajian'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="activity-form form-grid">
      <div className="span-2">
        <label>Judul Kajian</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="mis. Kajian Tafsir Juz 'Amma"
          required
        />
      </div>
      <div>
        <label>Ustadz / Pemateri</label>
        <input value={speaker} onChange={(e) => setSpeaker(e.target.value)} />
      </div>
      <div>
        <label>Jadwal</label>
        <input
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          placeholder="mis. Setiap Kamis ba'da Maghrib"
        />
      </div>
      <div className="span-2">
        <label>Tempat / Link</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div className="span-2">
        <label>Keterangan</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      {initial && (
        <label className="checkbox span-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Kajian aktif
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
