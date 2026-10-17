import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Kajian, KajianInput } from '@/types'
import { kajianAPI } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { KajianForm } from '@/components/kajian/KajianForm'
import { canCreateKajianRole, formatDate, getErrorMessage } from '@/utils/labels'

export const KajianListPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [list, setList] = useState<Kajian[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    kajianAPI
      .getList()
      .then((response) => setList(response.data))
      .catch((err) => setError(getErrorMessage(err, 'Gagal memuat kajian')))
      .finally(() => setIsLoading(false))
  }, [])

  const handleCreate = async (data: KajianInput) => {
    const response = await kajianAPI.create(data)
    navigate(`/kajian/${response.data.id}`)
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="activity-list">
      <div className="page-header">
        <h2>Kajian Rutin</h2>
        {canCreateKajianRole(user?.role) && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? 'Batal' : 'Buat Kajian'}
          </button>
        )}
      </div>

      {showForm && (
        <KajianForm
          submitLabel="Buat Kajian"
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {error && <div className="error">{error}</div>}

      {list.length === 0 ? (
        <p className="muted">Belum ada kajian rutin.</p>
      ) : (
        <div className="activities">
          {list.map((k) => (
            <Link
              key={k.id}
              to={`/kajian/${k.id}`}
              className={`activity-card card-link${k.isActive ? '' : ' inactive'}`}
            >
              <h3>
                {k.title}{' '}
                {!k.isActive && <span className="badge badge-muted">Nonaktif</span>}
              </h3>
              {k.speaker && <p>Pemateri: {k.speaker}</p>}
              {k.schedule && <p>Jadwal: {k.schedule}</p>}
              {k.location && <p>Tempat: {k.location}</p>}
              <p className="muted">
                {k.meetingCount ?? 0} sesi
                {k.lastMeeting &&
                  ` · terakhir ${formatDate(k.lastMeeting.date)}: ${k.lastMeeting.topic}`}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
