import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { MurabbiNote } from '@/types'
import { authAPI, noteAPI } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatRoles, getErrorMessage } from '@/utils/labels'
import { NOTE_CATEGORY_LABELS } from '@/components/notes/MurabbiNotes'

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [notes, setNotes] = useState<MurabbiNote[]>([])

  useEffect(() => {
    noteAPI
      .getMine()
      .then((res) => setNotes(res.data))
      .catch((err) => console.error('Gagal memuat catatan murabbi:', err))
  }, [])

  if (!user) return null

  const emailChanged = email.trim().toLowerCase() !== user.email

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsSaving(true)
    try {
      const response = await authAPI.updateProfile({
        name,
        email,
        phone: phone || null,
        bio: bio || null,
        currentPassword: emailChanged ? currentPassword : undefined,
      })
      updateUser(response.data)
      setCurrentPassword('')
      setSuccess('Profil tersimpan.')
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menyimpan profil'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="activity-list">
      <div className="page-header">
        <h2>Profil Saya</h2>
        <Link to="/ganti-password" className="btn-small">
          Ganti Password
        </Link>
      </div>

      <p className="muted section">
        Peran: {formatRoles(user.roles)} · Bergabung{' '}
        {new Date(user.createdAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>

      <form onSubmit={handleSubmit} className="activity-form password-form section">
        <div>
          <label>Nama</label>
          <input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={100} required />
        </div>
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        {emailChanged && (
          <div>
            <label>Password saat ini (wajib untuk ganti email)</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        )}
        <div>
          <label>No. HP / WhatsApp (opsional)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08xxxxxxxxxx"
            maxLength={30}
          />
        </div>
        <div>
          <label>Tentang saya (opsional)</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500} />
        </div>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        <button type="submit" className="btn-primary" disabled={isSaving}>
          {isSaving ? 'Menyimpan...' : 'Simpan Profil'}
        </button>
      </form>

      <div className="section">
        <h3>Catatan dari Murabbi</h3>
        {notes.length === 0 ? (
          <p className="muted">Belum ada catatan yang dibagikan murabbi kepadamu.</p>
        ) : (
          <ul className="note-list">
            {notes.map((note) => (
              <li key={note.id} className={`note-item note-${note.category}`}>
                <div className="note-meta">
                  <span className="badge">{NOTE_CATEGORY_LABELS[note.category]}</span>
                  <span className="muted">
                    {formatDate(note.date)}
                    {note.author && ` · ${note.author.name}`}
                    {note.group && ` · ${note.group.name}`}
                  </span>
                </div>
                <p className="pre-line">{note.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
