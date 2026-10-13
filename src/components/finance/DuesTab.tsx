import React, { useCallback, useEffect, useState } from 'react'
import type { DuesStatus, FinanceAccount } from '@/types'
import { financeAPI } from '@/services/api'
import { MONTH_LABELS, formatMoney, getErrorMessage } from '@/utils/labels'

interface DuesTabProps {
  account: FinanceAccount
  onChanged: () => void
}

export const DuesTab: React.FC<DuesTabProps> = ({ account, onChanged }) => {
  const plans = account.duesPlans ?? []
  const [planId, setPlanId] = useState<number | null>(plans.find((p) => p.isActive)?.id ?? plans[0]?.id ?? null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [status, setStatus] = useState<DuesStatus | null>(null)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('Iuran bulanan')
  const [newAmount, setNewAmount] = useState('')

  const load = useCallback(async () => {
    if (!planId) {
      setStatus(null)
      return
    }
    try {
      const response = await financeAPI.getDuesStatus(planId, year)
      setStatus(response.data)
      setError('')
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal memuat iuran'))
    }
  }, [planId, year])

  useEffect(() => {
    load()
  }, [load])

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await financeAPI.createDuesPlan(account.id, {
        name: newName,
        amount: Number(newAmount),
      })
      setNewAmount('')
      setPlanId(response.data.id)
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal membuat iuran'))
    }
  }

  const togglePlanActive = async () => {
    if (!status) return
    try {
      await financeAPI.updateDuesPlan(status.plan.id, { isActive: !status.plan.isActive })
      onChanged()
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal mengubah iuran'))
    }
  }

  const handleCell = async (userId: number, name: string, month: string, paid: number) => {
    if (!status?.canManage) return
    const plan = status.plan
    try {
      if (paid > 0) {
        if (!confirm(`Batalkan pembayaran ${name} untuk ${month} (${formatMoney(paid)})?`)) return
        await financeAPI.cancelDues(plan.id, userId, month)
      } else {
        if (!plan.isActive) return
        if (!confirm(`Catat iuran ${name} untuk ${month} sebesar ${formatMoney(plan.amount)}?`)) return
        await financeAPI.payDues(plan.id, { userId, period: month })
      }
      await load()
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menyimpan pembayaran'))
    }
  }

  return (
    <>
      {error && <div className="error">{error}</div>}

      {account.canManage && account.isActive && (
        <form onSubmit={handleCreatePlan} className="inline-form no-print">
          <strong>Iuran baru:</strong>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama iuran" required />
          <input
            type="number"
            min="1"
            step="any"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder="Nominal per bulan"
            required
          />
          <button type="submit" className="btn-primary btn-small">
            Tambah
          </button>
        </form>
      )}

      {plans.length === 0 ? (
        <p className="muted">Belum ada iuran rutin di kas ini.</p>
      ) : (
        <>
          <div className="report-controls no-print">
            <select value={planId ?? ''} onChange={(e) => setPlanId(Number(e.target.value))}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatMoney(p.amount)}/bulan){p.isActive ? '' : ' - nonaktif'}
                </option>
              ))}
            </select>
            <div className="segmented">
              <button type="button" onClick={() => setYear(year - 1)}>
                &larr;
              </button>
              <button type="button" className="selected">
                {year}
              </button>
              <button type="button" onClick={() => setYear(year + 1)}>
                &rarr;
              </button>
            </div>
            {status?.canManage && (
              <button className="btn-secondary btn-small" onClick={togglePlanActive}>
                {status.plan.isActive ? 'Nonaktifkan iuran' : 'Aktifkan iuran'}
              </button>
            )}
          </div>

          {status && (
            <>
              <p className="muted">
                Terkumpul {year}: <strong>{formatMoney(status.totals.collected)}</strong>
                {status.canManage && status.plan.isActive && ' · Klik sel untuk mencatat atau membatalkan pembayaran.'}
              </p>
              <div className="table-wrap">
                <table className="table report-table matrix dues-matrix">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      {MONTH_LABELS.map((m) => (
                        <th key={m}>{m}</th>
                      ))}
                      <th>Lunas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.members.map((m) => (
                      <tr key={m.userId}>
                        <td>
                          {m.name}
                          {!m.isMember && <span className="badge badge-muted">Bukan anggota</span>}
                        </td>
                        {status.months.map((mo) => {
                          const paid = m.perMonth[mo]
                          const cls =
                            paid >= status.plan.amount ? 'cell-done' : paid > 0 ? 'cell-partial' : 'cell-empty'
                          return (
                            <td
                              key={mo}
                              className={`${cls}${status.canManage ? ' clickable' : ''}`}
                              title={paid ? formatMoney(paid) : 'Belum bayar'}
                              onClick={() => handleCell(m.userId, m.name, mo, paid)}
                            >
                              {paid >= status.plan.amount ? '✓' : paid > 0 ? 'sebagian' : '·'}
                            </td>
                          )
                        })}
                        <td>
                          {m.paidMonths}/12
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}
