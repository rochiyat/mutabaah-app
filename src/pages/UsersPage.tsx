import React, { useEffect, useState } from 'react'
import type { Role, User } from '@/types'
import { userAPI } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_LABELS, getErrorMessage } from '@/utils/labels'

const ALL_ROLES: Role[] = ['user', 'murabbi', 'admin', 'superadmin']

export const UsersPage: React.FC = () => {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const isSuperadmin = me?.role === 'superadmin'
  const assignableRoles = isSuperadmin ? ALL_ROLES : ALL_ROLES.filter((r) => r !== 'superadmin')

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const response = await userAPI.getUsers(search.trim() || undefined)
        setUsers(response.data)
        setError('')
      } catch (err) {
        setError(getErrorMessage(err, 'Gagal memuat user'))
      } finally {
        setIsLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const replaceUser = (updated: User) =>
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))

  const changeRole = async (target: User, role: Role) => {
    setError('')
    try {
      replaceUser((await userAPI.updateRole(target.id, role)).data)
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal mengubah role'))
    }
  }

  const toggleActive = async (target: User) => {
    const action = target.isActive ? 'Nonaktifkan' : 'Aktifkan'
    if (!confirm(`${action} akun ${target.name}?`)) return
    setError('')
    try {
      replaceUser((await userAPI.updateStatus(target.id, !target.isActive)).data)
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal mengubah status'))
    }
  }

  return (
    <div className="activity-list">
      <div className="page-header">
        <h2>Kelola User</h2>
        <input
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau email"
        />
      </div>

      {error && <div className="error">{error}</div>}

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                // Diri sendiri & superadmin (bagi admin) tidak bisa diubah
                const locked = u.id === me?.id || (!isSuperadmin && u.role === 'superadmin')
                return (
                  <tr key={u.id} className={u.isActive ? '' : 'inactive'}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      {locked ? (
                        ROLE_LABELS[u.role]
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u, e.target.value as Role)}
                        >
                          {assignableRoles.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {locked ? (
                        u.isActive ? 'Aktif' : 'Nonaktif'
                      ) : (
                        <button
                          className={`btn-small ${u.isActive ? 'btn-danger' : 'btn-primary'}`}
                          onClick={() => toggleActive(u)}
                        >
                          {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {users.length >= 100 && (
            <p className="muted">Menampilkan 100 user pertama, persempit dengan pencarian.</p>
          )}
        </div>
      )}
    </div>
  )
}
