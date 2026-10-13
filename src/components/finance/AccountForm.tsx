import React, { useState } from 'react'
import type { FinanceAccount, FinanceAccountInput, Group } from '@/types'
import { getErrorMessage } from '@/utils/labels'

interface AccountFormProps {
  initial?: FinanceAccount
  // Pilihan pemilik kas (hanya saat membuat): null = kas lembaga
  ownerOptions?: { canLembaga: boolean; groups: Group[] }
  submitLabel: string
  onSubmit: (data: FinanceAccountInput) => Promise<void>
  onCancel?: () => void
}

export const AccountForm: React.FC<AccountFormProps> = ({
  initial,
  ownerOptions,
  submitLabel,
  onSubmit,
  onCancel,
}) => {
  const defaultOwner = ownerOptions?.canLembaga ? '' : String(ownerOptions?.groups[0]?.id ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [owner, setOwner] = useState(defaultOwner)
  const [openingBalance, setOpeningBalance] = useState(String(initial?.openingBalance ?? 0))
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
        name,
        description: description || null,
        openingBalance: Number(openingBalance) || 0,
        ...(initial ? { isActive } : { groupId: owner ? Number(owner) : null }),
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menyimpan kas'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="activity-form form-grid">
      <div>
        <label>Nama Kas</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Kas Umum" required />
      </div>
      {ownerOptions ? (
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
      ) : (
        <div />
      )}
      <div>
        <label>Saldo Awal (Rp)</label>
        <input
          type="number"
          step="any"
          value={openingBalance}
          onChange={(e) => setOpeningBalance(e.target.value)}
        />
      </div>
      <div className="span-2">
        <label>Keterangan</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
      {initial && (
        <label className="checkbox span-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Kas aktif (kas nonaktif tidak bisa menerima transaksi baru)
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
