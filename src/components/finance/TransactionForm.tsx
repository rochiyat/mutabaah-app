import React, { useState } from 'react'
import type { Program, Transaction, TransactionInput, TransactionType, User } from '@/types'
import { UserPicker } from '@/components/users/UserPicker'
import { TRANSACTION_CATEGORIES, getErrorMessage, todayKey } from '@/utils/labels'

interface TransactionFormProps {
  initial?: Transaction
  programs: Program[]
  submitLabel: string
  onSubmit: (data: TransactionInput) => Promise<void>
  onCancel?: () => void
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  initial,
  programs,
  submitLabel,
  onSubmit,
  onCancel,
}) => {
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'masuk')
  const [date, setDate] = useState(initial?.date ?? todayKey())
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [category, setCategory] = useState(initial?.category ?? 'infaq')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [member, setMember] = useState<{ id: number; name: string } | null>(initial?.member ?? null)
  const [programId, setProgramId] = useState(initial?.programId ? String(initial.programId) : '')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const switchType = (next: TransactionType) => {
    setType(next)
    // Ganti kategori default bila kategori lama tidak cocok dengan jenis baru
    if (!(TRANSACTION_CATEGORIES[next] as readonly string[]).includes(category)) {
      setCategory(TRANSACTION_CATEGORIES[next][0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await onSubmit({
        type,
        date,
        amount: Number(amount),
        category: category.trim(),
        description: description || null,
        memberId: member?.id ?? null,
        programId: programId ? Number(programId) : null,
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menyimpan transaksi'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="activity-form form-grid">
      <div className="span-2">
        <div className="segmented type-toggle">
          <button
            type="button"
            className={type === 'masuk' ? 'selected type-in' : ''}
            onClick={() => switchType('masuk')}
          >
            Pemasukan
          </button>
          <button
            type="button"
            className={type === 'keluar' ? 'selected type-out' : ''}
            onClick={() => switchType('keluar')}
          >
            Pengeluaran
          </button>
        </div>
      </div>
      <div>
        <label>Tanggal</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div>
        <label>Nominal (Rp)</label>
        <input
          type="number"
          min="1"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="mis. 50000"
          required
        />
      </div>
      <div>
        <label>Kategori</label>
        <input
          list={`categories-${type}`}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />
        <datalist id={`categories-${type}`}>
          {TRANSACTION_CATEGORIES[type].map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div>
        <label>Program (opsional)</label>
        <select value={programId} onChange={(e) => setProgramId(e.target.value)}>
          <option value="">-</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="span-2">
        <label>Keterangan</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="mis. Infaq Jumat pekan ke-2"
        />
      </div>
      <div className="span-2">
        <label>{type === 'masuk' ? 'Dari anggota' : 'Kepada anggota'} (opsional)</label>
        {member ? (
          <div className="inline-form no-margin">
            <strong>{member.name}</strong>
            <button type="button" className="btn-secondary btn-small" onClick={() => setMember(null)}>
              Hapus
            </button>
          </div>
        ) : (
          <UserPicker excludeIds={[]} onSelect={(u: User) => setMember({ id: u.id, name: u.name })} />
        )}
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
