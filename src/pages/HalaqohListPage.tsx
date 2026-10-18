import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Group, GroupInput } from '@/types'
import { groupAPI } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { GroupForm } from '@/components/halaqoh/GroupForm'
import { MEMBER_ROLE_LABELS, canCreateGroupRole, getErrorMessage } from '@/utils/labels'

export const HalaqohListPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    groupAPI
      .getGroups()
      .then((response) => setGroups(response.data))
      .catch((err) => setError(getErrorMessage(err, 'Gagal memuat halaqoh')))
      .finally(() => setIsLoading(false))
  }, [])

  const handleCreate = async (data: GroupInput) => {
    const response = await groupAPI.createGroup(data)
    navigate(`/halaqoh/${response.data.id}`)
  }

  if (isLoading) return <div className="loading">Memuat...</div>

  return (
    <div className="activity-list">
      <div className="page-header">
        <h2>Halaqoh</h2>
        {canCreateGroupRole(user?.roles) && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? 'Batal' : 'Buat Halaqoh'}
          </button>
        )}
      </div>

      {showForm && (
        <GroupForm
          submitLabel="Buat Halaqoh"
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {error && <div className="error">{error}</div>}

      {groups.length === 0 ? (
        <p className="muted">Belum tergabung di halaqoh mana pun.</p>
      ) : (
        <div className="activities">
          {groups.map((group) => (
            <Link
              key={group.id}
              to={`/halaqoh/${group.id}`}
              className={`activity-card card-link${group.isActive ? '' : ' inactive'}`}
            >
              <h3>
                {group.name}{' '}
                {!group.isActive && <span className="badge badge-muted">Nonaktif</span>}
                {group.myRole && (
                  <span className="badge">{MEMBER_ROLE_LABELS[group.myRole]}</span>
                )}
              </h3>
              {group.level && <p>Jenjang: {group.level}</p>}
              {group.schedule && <p>Jadwal: {group.schedule}</p>}
              {group.location && <p>Tempat: {group.location}</p>}
              <p>Penanggung jawab: {group.admin?.name ?? '-'}</p>
              <p className="muted">
                {group.memberCount ?? 0} anggota · {group.activityCount ?? 0} amalan
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
