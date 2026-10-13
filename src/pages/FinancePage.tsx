import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { FinanceAccount, FinanceAccountInput, Group } from '@/types'
import { financeAPI, groupAPI } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { AccountForm } from '@/components/finance/AccountForm'
import { formatMoney, getErrorMessage, isFinanceManagerRole, isManagerRole } from '@/utils/labels'

export const FinancePage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [manageableGroups, setManageableGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    Promise.all([financeAPI.getAccounts(), groupAPI.getGroups()])
      .then(([a, g]) => {
        setAccounts(a.data)
        setManageableGroups(
          g.data.filter(
            (x) => x.myRole === 'murabbi' || x.adminId === user?.id || isManagerRole(user?.role)
          )
        )
      })
      .catch((err) => setError(getErrorMessage(err, 'Gagal memuat kas')))
      .finally(() => setIsLoading(false))
  }, [user])

  const canLembaga = isFinanceManagerRole(user?.role)
  const canCreate = canLembaga || manageableGroups.length > 0

  const handleCreate = async (data: FinanceAccountInput) => {
    const response = await financeAPI.createAccount(data)
    navigate(`/keuangan/${response.data.id}`)
  }

  if (isLoading) return <div>Loading...</div>

  const lembaga = accounts.filter((a) => !a.group)
  const halaqoh = accounts.filter((a) => a.group)

  const renderCards = (list: FinanceAccount[]) => (
    <div className="activities">
      {list.map((a) => (
        <Link
          key={a.id}
          to={`/keuangan/${a.id}`}
          className={`activity-card card-link${a.isActive ? '' : ' inactive'}`}
        >
          <h3>
            {a.name} {!a.isActive && <span className="badge badge-muted">Nonaktif</span>}
          </h3>
          {a.group && <p>Halaqoh {a.group.name}</p>}
          <p className={`money-big${a.balance < 0 ? ' negative' : ''}`}>{formatMoney(a.balance)}</p>
          <p className="muted">
            Masuk {formatMoney(a.totals.masuk)} · Keluar {formatMoney(a.totals.keluar)}
          </p>
        </Link>
      ))}
    </div>
  )

  return (
    <div className="activity-list">
      <div className="page-header">
        <h2>Keuangan</h2>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Batal' : 'Buat Kas'}
          </button>
        )}
      </div>

      {showForm && (
        <AccountForm
          ownerOptions={{ canLembaga, groups: manageableGroups }}
          submitLabel="Buat Kas"
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {error && <div className="error">{error}</div>}

      {accounts.length === 0 ? (
        <p className="muted">
          Belum ada kas yang bisa Anda lihat. Kas halaqoh terlihat oleh anggota halaqohnya; kas
          lembaga hanya untuk bendahara dan pengurus.
        </p>
      ) : (
        <>
          {lembaga.length > 0 && (
            <>
              <h3 className="report-subtitle">Kas Lembaga</h3>
              {renderCards(lembaga)}
            </>
          )}
          {halaqoh.length > 0 && (
            <>
              <h3 className="report-subtitle">Kas Halaqoh</h3>
              {renderCards(halaqoh)}
            </>
          )}
        </>
      )}
    </div>
  )
}
