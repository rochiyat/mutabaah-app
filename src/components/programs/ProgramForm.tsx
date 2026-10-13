import React, { useState } from 'react'
import type { Group, Program, ProgramInput, ProgramStatus, User } from '@/types'
import { UserPicker } from '@/components/users/UserPicker'
import { PROGRAM_STATUS_LABELS, getErrorMessage } from '@/utils/labels'

interface ProgramFormProps {
  initial?: Program
  ownerOptions?: { canLembaga: boolean; groups: Group[] }
  submitLabel: string
  onSubmit: (data: ProgramInput) => Promise<void>
  onCancel?: () => void
}

export const ProgramForm: React.FC<ProgramFormProps> = ({
  initial,
  ownerOptions,
  submitLabel,
  onSubmit,
  onCancel,
}) => {
  const defaultOwner = ownerOptions?.canLembaga ? '' : String(ownerOptions?.groups[0]?.id ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [owner, setOwner] = useState(defaultOwner)
  const [status, setStatus] = useState<ProgramStatus>(initial?.status ?? 'rencana')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [budget, setBudget] = useState(initial?.budget != null ? String(initial.budget) : '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [pic, setPic] = useState<{ id: number; name: string } | null>(initial?.pic ?? null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await onSubmit({
        name,
        status,
        startDate: startDate || null,
        endDate: endDate || null,
        location: location || null,
        budget: budget === '' ? null : Number(budget),
        description: description || null,
        ...(pic ? { picId: pic.id } : {}),
        ...(initial ? {} : { groupId: owner ? Number(owner) : null }),
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menyimpan program'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="activity-form form-grid">
      <div className="span-2">
        <label>Nama Program</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Tabligh Akbar" required />
      </div>
      {ownerOptions && (
        <div>
          <label>Milik</label>
          <select value={owner} onChange={(e) => setOwner(e.target.value)}>
            {ownerOptions.canLembaga && <option value="">Lembaga</option>}
            {ownerOptions.groups.map((g) => (
              <option key={g.id} value={g.id}>
                Halaqoh {g.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as ProgramStatus)}>
          {(Object.keys(PROGRAM_STATUS_LABELS) as ProgramStatus[]).map((s) => (
            <option key={s} value={s}>
              {PROGRAM_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Tanggal mulai</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      <div>
        <label>Tanggal selesai</label>
        <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      <div>
        <label>Tempat</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div>
        <label>Anggaran (Rp, opsional)</label>
        <input type="number" min="0" step="any" value={budget} onChange={(e) => setBudget(e.target.value)} />
      </div>
      <div className="span-2">
        <label>Penanggung jawab {initial ? '' : '(kosong = Anda sendiri)'}</label>
        {pic ? (
          <div className="inline-form no-margin">
            <strong>{pic.name}</strong>
            <button type="button" className="btn-secondary btn-small" onClick={() => setPic(null)}>
              Ganti
            </button>
          </div>
        ) : (
          <UserPicker excludeIds={[]} onSelect={(u: User) => setPic({ id: u.id, name: u.name })} />
        )}
      </div>
      <div className="span-2">
        <label>Deskripsi</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
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
