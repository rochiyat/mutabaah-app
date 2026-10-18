import React, { useEffect, useState } from 'react'
import type { Role, User } from '@/types'
import { userAPI } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_LABELS, assignableRolesFor, formatRoles, getErrorMessage } from '@/utils/labels'

export const UsersPage: React.FC = () => {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  // Password sementara hasil reset, ditampilkan sekali
  const [resetResult, setResetResult] = useState<{ name: string; password: string } | null>(null)

  const assignableRoles = assignableRolesFor(me?.roles)

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

  const toggleRole = async (target: User, role: Role) => {
    const roles = target.roles.includes(role)
      ? target.roles.filter((r) => r !== role)
      : [...target.roles, role]
    setError('')
    try {
      replaceUser((await userAPI.updateRoles(target.id, roles)).data)
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

  const resetPassword = async (target: User) => {
    if (!confirm(`Reset password ${target.name}? Semua sesi login-nya akan berakhir.`)) return
    setError('')
    setResetResult(null)
    try {
      const { data } = await userAPI.resetPassword(target.id)
      replaceUser(data.user)
      setResetResult({ name: target.name, password: data.temporaryPassword })
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal me-reset password'))
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

      {resetResult && (
        <div className="success reset-result">
          <p>
            Password sementara untuk <strong>{resetResult.name}</strong>:{' '}
            <code>{resetResult.password}</code>
          </p>
          <p className="muted">
            Sampaikan langsung ke yang bersangkutan. Password ini hanya ditampilkan sekali, dan
            user wajib menggantinya saat login.
          </p>
          <button className="btn-small" onClick={() => setResetResult(null)}>
            Tutup
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="loading">Memuat...</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Password</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                // Diri sendiri & user dengan role di atas wewenang kita tidak bisa diubah
                const locked =
                  u.id === me?.id || !u.roles.every((r) => assignableRoles.includes(r))
                return (
                  <tr key={u.id} className={u.isActive ? '' : 'inactive'}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      {locked ? (
                        formatRoles(u.roles)
                      ) : (
                        <div className="role-checks">
                          {assignableRoles.map((r) => (
                            <label key={r} className="role-check">
                              <input
                                type="checkbox"
                                checked={u.roles.includes(r)}
                                onChange={() => toggleRole(u, r)}
                              />
                              {ROLE_LABELS[r]}
                            </label>
                          ))}
                          {u.roles.length === 0 && <span className="muted">Anggota</span>}
                        </div>
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
                    <td>
                      {!locked && (
                        <button className="btn-small" onClick={() => resetPassword(u)}>
                          Reset
                        </button>
                      )}
                      {u.mustChangePassword && <div className="muted">Menunggu diganti</div>}
                      {u.lockedUntil && new Date(u.lockedUntil) > new Date() && (
                        <div className="muted">
                          Login terkunci s/d{' '}
                          {new Date(u.lockedUntil).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
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
