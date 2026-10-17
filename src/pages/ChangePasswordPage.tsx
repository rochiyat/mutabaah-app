import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/utils/labels'

export const ChangePasswordPage: React.FC = () => {
  const { user, setSession } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const mustChange = !!user?.mustChangePassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 8) {
      setError('Password baru minimal 8 karakter')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak sama')
      return
    }

    setIsSaving(true)
    try {
      const response = await authAPI.changePassword(currentPassword, newPassword)
      setSession(response.data)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      if (mustChange) {
        navigate('/dashboard')
      } else {
        setSuccess('Password berhasil diganti. Sesi di perangkat lain otomatis keluar.')
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal mengganti password'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="activity-list">
      <div className="page-header">
        <h2>Ganti Password</h2>
      </div>

      {mustChange && (
        <div className="error">
          Password Anda baru saja di-reset oleh pengurus. Silakan buat password baru untuk
          melanjutkan.
        </div>
      )}

      <form onSubmit={handleSubmit} className="activity-form password-form">
        <div>
          <label>{mustChange ? 'Password sementara' : 'Password lama'}</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <div>
          <label>Password baru</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div>
          <label>Ulangi password baru</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        <button type="submit" className="btn-primary" disabled={isSaving}>
          {isSaving ? 'Menyimpan...' : 'Simpan Password'}
        </button>
      </form>
    </div>
  )
}
