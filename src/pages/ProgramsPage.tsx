import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Group, Program, ProgramInput, ProgramStatus } from '@/types'
import { groupAPI, programAPI } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { ProgramForm } from '@/components/programs/ProgramForm'
import {
  PROGRAM_STATUS_LABELS,
  canCreateKajianRole,
  formatDate,
  formatMoney,
  getErrorMessage,
  isManagerRole,
} from '@/utils/labels'

export const ProgramDates: React.FC<{ start?: string | null; end?: string | null }> = ({ start, end }) => {
  if (!start && !end) return null
  if (start && end && start !== end) return <>{formatDate(start)} – {formatDate(end)}</>
  return <>{formatDate((start || end)!)}</>
}

export const ProgramsPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [programs, setPrograms] = useState<Program[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [statusFilter, setStatusFilter] = useState<ProgramStatus | ''>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    Promise.all([programAPI.getList(), groupAPI.getGroups()])
      .then(([p, g]) => {
        setPrograms(p.data)
        setGroups(
          g.data.filter((x) => x.myRole === 'murabbi' || x.adminId === user?.id || isManagerRole(user?.roles))
        )
      })
      .catch((err) => setError(getErrorMessage(err, 'Gagal memuat program')))
      .finally(() => setIsLoading(false))
  }, [user])

  const canLembaga = canCreateKajianRole(user?.roles)
  const canCreate = canLembaga || groups.length > 0

  const handleCreate = async (data: ProgramInput) => {
    const response = await programAPI.create(data)
    navigate(`/program/${response.data.id}`)
  }

  if (isLoading) return <div>Loading...</div>

  const visible = statusFilter ? programs.filter((p) => p.status === statusFilter) : programs

  return (
    <div className="activity-list">
      <div className="page-header">
        <h2>Program</h2>
        <div className="actions">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProgramStatus | '')}>
            <option value="">Semua status</option>
            {(Object.keys(PROGRAM_STATUS_LABELS) as ProgramStatus[]).map((s) => (
              <option key={s} value={s}>
                {PROGRAM_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {canCreate && (
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Batal' : 'Buat Program'}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <ProgramForm
          ownerOptions={{ canLembaga, groups }}
          submitLabel="Buat Program"
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {error && <div className="error">{error}</div>}

      {visible.length === 0 ? (
        <p className="muted">Belum ada program.</p>
      ) : (
        <div className="activities">
          {visible.map((p) => (
            <Link key={p.id} to={`/program/${p.id}`} className={`activity-card card-link program-${p.status}`}>
              <h3>
                {p.name} <span className={`badge status-badge-${p.status}`}>{PROGRAM_STATUS_LABELS[p.status]}</span>
                {p.myRole && <span className="badge">{p.myRole === 'panitia' ? 'Panitia' : 'Peserta'}</span>}
              </h3>
              <p>{p.group ? `Halaqoh ${p.group.name}` : 'Program lembaga'}</p>
              {(p.startDate || p.endDate) && (
                <p>
                  <ProgramDates start={p.startDate} end={p.endDate} />
                </p>
              )}
              {p.location && <p>Tempat: {p.location}</p>}
              <p className="muted">
                PJ: {p.pic?.name ?? '-'} · {p.participantCount ?? 0} orang
                {p.budget != null && ` · Anggaran ${formatMoney(p.budget)}`}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
