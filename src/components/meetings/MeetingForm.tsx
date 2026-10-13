import React, { useState } from 'react'
import type { Meeting, MeetingInput } from '@/types'
import { getErrorMessage, todayKey } from '@/utils/labels'

interface MeetingFormProps {
  initial?: Meeting
  defaults?: Partial<MeetingInput>
  submitLabel: string
  onSubmit: (data: MeetingInput) => Promise<void>
  onCancel?: () => void
}

export const MeetingForm: React.FC<MeetingFormProps> = ({
  initial,
  defaults,
  submitLabel,
  onSubmit,
  onCancel,
}) => {
  const [date, setDate] = useState(initial?.date ?? todayKey())
  const [startTime, setStartTime] = useState(initial?.startTime ?? '')
  const [topic, setTopic] = useState(initial?.topic ?? '')
  const [speaker, setSpeaker] = useState(initial?.speaker ?? defaults?.speaker ?? '')
  const [location, setLocation] = useState(initial?.location ?? defaults?.location ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await onSubmit({
        date,
        startTime: startTime || null,
        topic,
        speaker: speaker || null,
        location: location || null,
        notes: notes || null,
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menyimpan pertemuan'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="activity-form form-grid">
      <div>
        <label>Tanggal</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div>
        <label>Jam (opsional)</label>
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
      </div>
      <div className="span-2">
        <label>Materi / Tema</label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="mis. Tafsir Surat Al-Mulk"
          required
        />
      </div>
      <div>
        <label>Pemateri</label>
        <input value={speaker} onChange={(e) => setSpeaker(e.target.value)} />
      </div>
      <div>
        <label>Tempat / Link</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div className="span-2">
        <label>Catatan</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
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
