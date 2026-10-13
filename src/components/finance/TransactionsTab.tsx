import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  FinanceAccount,
  Program,
  Transaction,
  TransactionInput,
  TransactionList,
  TransactionType,
} from '@/types'
import { financeAPI } from '@/services/api'
import { defaultPeriod } from '@/utils/period'
import { formatDate, formatMoney, getErrorMessage } from '@/utils/labels'
import { PeriodPicker } from '@/components/reports/PeriodPicker'
import { ReportToolbar } from '@/components/reports/ReportToolbar'
import { TransactionForm } from './TransactionForm'

interface TransactionsTabProps {
  account: FinanceAccount
  programs: Program[]
  onChanged: () => void // muat ulang saldo kas
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({ account, programs, onChanged }) => {
  const initial = useMemo(defaultPeriod, [])
  const [period, setPeriod] = useState(initial)
  const [typeFilter, setTypeFilter] = useState<TransactionType | ''>('')
  const [data, setData] = useState<TransactionList | null>(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await financeAPI.getTransactions(account.id, {
        ...period,
        type: typeFilter || undefined,
      })
      setData(response.data)
      setError('')
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal memuat transaksi'))
    }
  }, [account.id, period, typeFilter])

  useEffect(() => {
    load()
  }, [load])

  const afterChange = async () => {
    await load()
    onChanged()
  }

  const handleCreate = async (input: TransactionInput) => {
    await financeAPI.createTransaction(account.id, input)
    setShowForm(false)
    await afterChange()
  }

  const handleUpdate = async (input: TransactionInput) => {
    if (!editing) return
    await financeAPI.updateTransaction(editing.id, input)
    setEditing(null)
    await afterChange()
  }

  const handleDelete = async (t: Transaction) => {
    if (!confirm(`Hapus transaksi ${formatMoney(t.amount)} (${t.category})?`)) return
    try {
      await financeAPI.deleteTransaction(t.id)
      await afterChange()
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menghapus transaksi'))
    }
  }

  const s = data?.summary

  return (
    <>
      <div className="page-header">
        <div className="report-controls no-print no-margin">
          <PeriodPicker start={period.start} end={period.end} onChange={setPeriod} />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TransactionType | '')}>
            <option value="">Semua jenis</option>
            <option value="masuk">Pemasukan</option>
            <option value="keluar">Pengeluaran</option>
          </select>
        </div>
        <div className="actions no-print">
          <ReportToolbar onDownload={() => financeAPI.downloadTransactions(account.id, period)} />
          {account.canManage && account.isActive && (
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Batal' : 'Catat Transaksi'}
            </button>
          )}
        </div>
      </div>

      <p className="print-only">
        Periode {period.start} s.d. {period.end}
      </p>

      {showForm && (
        <TransactionForm
          programs={programs}
          submitLabel="Simpan Transaksi"
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {error && <div className="error">{error}</div>}

      {s && (
        <div className="stats-grid money-cards">
          <div className="count-card">
            <span>Saldo awal periode</span>
            <strong>{formatMoney(s.openingForPeriod)}</strong>
          </div>
          <div className="count-card money-in">
            <span>Pemasukan</span>
            <strong>{formatMoney(s.masuk)}</strong>
          </div>
          <div className="count-card money-out">
            <span>Pengeluaran</span>
            <strong>{formatMoney(s.keluar)}</strong>
          </div>
          <div className="count-card">
            <span>Saldo akhir periode</span>
            <strong>{formatMoney(s.closing)}</strong>
          </div>
        </div>
      )}

      {s && s.byCategory.length > 0 && (
        <div className="category-breakdown">
          {s.byCategory.map((c) => (
            <span key={`${c.type}-${c.category}`} className={`chip ${c.type === 'masuk' ? 'chip-in' : 'chip-out'}`}>
              {c.category}: {formatMoney(c.total)} <span className="muted">({c.count}x)</span>
            </span>
          ))}
        </div>
      )}

      {data && data.transactions.length === 0 ? (
        <p className="muted">Belum ada transaksi dalam periode ini.</p>
      ) : (
        data && (
          <div className="table-wrap">
            <table className="table report-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Kategori</th>
                  <th>Keterangan</th>
                  <th className="num">Masuk</th>
                  <th className="num">Keluar</th>
                  {account.canManage && <th className="no-print"></th>}
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t) =>
                  editing?.id === t.id ? (
                    <tr key={t.id}>
                      <td colSpan={account.canManage ? 6 : 5}>
                        <TransactionForm
                          initial={t}
                          programs={programs}
                          submitLabel="Simpan Perubahan"
                          onSubmit={handleUpdate}
                          onCancel={() => setEditing(null)}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={t.id}>
                      <td>{formatDate(t.date)}</td>
                      <td>
                        <span className={`chip ${t.type === 'masuk' ? 'chip-in' : 'chip-out'}`}>{t.category}</span>
                      </td>
                      <td className="wrap">
                        {t.description || '-'}
                        {t.member && <div className="muted th-sub">Anggota: {t.member.name}</div>}
                        {t.program && (
                          <div className="muted th-sub">
                            Program: <Link to={`/program/${t.program.id}`}>{t.program.name}</Link>
                          </div>
                        )}
                      </td>
                      <td className="num money-in-text">{t.type === 'masuk' ? formatMoney(t.amount) : ''}</td>
                      <td className="num money-out-text">{t.type === 'keluar' ? formatMoney(t.amount) : ''}</td>
                      {account.canManage && (
                        <td className="no-print">
                          <div className="actions">
                            <button className="btn-secondary btn-small" onClick={() => setEditing(t)}>
                              Ubah
                            </button>
                            <button className="btn-danger btn-small" onClick={() => handleDelete(t)}>
                              Hapus
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  )
}
