import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { FinanceAccount, FinanceAccountInput, Program } from '@/types'
import { financeAPI, programAPI } from '@/services/api'
import { AccountForm } from '@/components/finance/AccountForm'
import { TransactionsTab } from '@/components/finance/TransactionsTab'
import { DuesTab } from '@/components/finance/DuesTab'
import { formatMoney, getErrorMessage } from '@/utils/labels'

export const FinanceAccountPage: React.FC = () => {
  const { id } = useParams()
  const accountId = Number(id)
  const navigate = useNavigate()

  const [account, setAccount] = useState<FinanceAccount | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [tab, setTab] = useState<'transaksi' | 'iuran'>('transaksi')

  const load = useCallback(async () => {
    try {
      const response = await financeAPI.getAccount(accountId)
      setAccount(response.data)
      setError('')
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal memuat kas'))
    } finally {
      setIsLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    load()
    programAPI
      .getList()
      .then((r) => setPrograms(r.data.filter((p) => p.status !== 'batal')))
      .catch(() => undefined)
  }, [load])

  if (isLoading) return <div>Loading...</div>
  if (!account) return <div className="error">{error || 'Kas tidak ditemukan'}</div>

  const handleUpdate = async (data: FinanceAccountInput) => {
    await financeAPI.updateAccount(account.id, data)
    setIsEditing(false)
    await load()
  }

  const handleDelete = async () => {
    if (!confirm(`Hapus kas "${account.name}"?`)) return
    try {
      await financeAPI.deleteAccount(account.id)
      navigate('/keuangan')
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menghapus kas'))
    }
  }

  return (
    <div className="finance-account">
      <p className="no-print">
        <Link to="/keuangan">&larr; Semua kas</Link>
      </p>

      {error && <div className="error">{error}</div>}

      <section className="activity-list section">
        <div className="page-header">
          <div>
            <h2>
              {account.name}{' '}
              {!account.isActive && <span className="badge badge-muted">Nonaktif</span>}
            </h2>
            <p className="muted">
              {account.group ? `Kas halaqoh ${account.group.name}` : 'Kas lembaga'}
              {account.description && ` · ${account.description}`}
            </p>
          </div>
          <div className="balance-box">
            <span className="muted">Saldo saat ini</span>
            <strong className={`money-big${account.balance < 0 ? ' negative' : ''}`}>
              {formatMoney(account.balance)}
            </strong>
            {account.canManage && !isEditing && (
              <div className="actions no-print">
                <button className="btn-secondary btn-small" onClick={() => setIsEditing(true)}>
                  Ubah
                </button>
                <button className="btn-danger btn-small" onClick={handleDelete}>
                  Hapus
                </button>
              </div>
            )}
          </div>
        </div>
        {isEditing && (
          <AccountForm
            initial={account}
            submitLabel="Simpan"
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
          />
        )}
      </section>

      <section className="activity-list section">
        <div className="tabs no-print">
          <button className={tab === 'transaksi' ? 'selected' : ''} onClick={() => setTab('transaksi')}>
            Transaksi
          </button>
          <button className={tab === 'iuran' ? 'selected' : ''} onClick={() => setTab('iuran')}>
            Iuran ({account.duesPlans?.length ?? 0})
          </button>
        </div>
        {tab === 'transaksi' ? (
          <TransactionsTab account={account} programs={programs} onChanged={load} />
        ) : (
          <DuesTab account={account} onChanged={load} />
        )}
      </section>
    </div>
  )
}
