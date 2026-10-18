import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type {
  AttendanceStatus,
  MeetingDetail,
  MeetingInput,
  PublicUser,
  User,
} from '@/types'
import { meetingAPI } from '@/services/api'
import { MeetingForm } from '@/components/meetings/MeetingForm'
import { UserPicker } from '@/components/users/UserPicker'
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
  MEMBER_ROLE_LABELS,
  formatDate,
  getErrorMessage,
} from '@/utils/labels'

type Draft = Record<number, { status: AttendanceStatus | null; note: string }>

export const MeetingDetailPage: React.FC = () => {
  const { id } = useParams()
  const meetingId = Number(id)
  const navigate = useNavigate()

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draft, setDraft] = useState<Draft>({})
  // Peserta kajian yang baru ditambahkan tapi belum disimpan
  const [extraUsers, setExtraUsers] = useState<PublicUser[]>([])

  const load = useCallback(async () => {
    try {
      const response = await meetingAPI.getById(meetingId)
      const data = response.data
      setMeeting(data)
      const initial: Draft = {}
      for (const a of data.attendances) {
        initial[a.userId] = { status: a.status, note: a.note ?? '' }
      }
      setDraft(initial)
      setExtraUsers([])
      setError('')
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal memuat pertemuan'))
    } finally {
      setIsLoading(false)
    }
  }, [meetingId])

  useEffect(() => {
    load()
  }, [load])

  // Baris yang ditampilkan di tabel absensi
  const rows = useMemo(() => {
    if (!meeting) return []
    if (meeting.group) {
      return meeting.roster.map((r) => ({ user: r.user, memberRole: r.memberRole }))
    }
    return [
      ...meeting.attendances.map((a) => ({ user: a.user!, memberRole: null })),
      ...extraUsers.map((u) => ({ user: u, memberRole: null })),
    ]
  }, [meeting, extraUsers])

  if (isLoading) return <div className="loading">Memuat...</div>
  if (!meeting) return <div className="error">{error || 'Pertemuan tidak ditemukan'}</div>

  const backLink = meeting.group
    ? { to: `/halaqoh/${meeting.group.id}`, label: meeting.group.name }
    : meeting.kajian
      ? { to: `/kajian/${meeting.kajian.id}`, label: meeting.kajian.title }
      : { to: '/dashboard', label: 'Dashboard' }

  const setStatus = (userId: number, status: AttendanceStatus) =>
    setDraft((prev) => ({ ...prev, [userId]: { note: prev[userId]?.note ?? '', status } }))

  const setNote = (userId: number, note: string) =>
    setDraft((prev) => ({ ...prev, [userId]: { status: prev[userId]?.status ?? null, note } }))

  const markAllPresent = () =>
    setDraft((prev) => {
      const next = { ...prev }
      for (const row of rows) {
        if (!next[row.user.id]?.status) {
          next[row.user.id] = { note: next[row.user.id]?.note ?? '', status: 'hadir' }
        }
      }
      return next
    })

  const handleSave = async () => {
    const entries = Object.entries(draft)
      .filter(([, v]) => v.status)
      .map(([userId, v]) => ({
        userId: Number(userId),
        status: v.status as AttendanceStatus,
        note: v.note || null,
      }))
    if (entries.length === 0) {
      setError('Belum ada status kehadiran yang dipilih')
      return
    }
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      await meetingAPI.saveAttendance(meeting.id, entries)
      await load()
      setMessage(`Absensi tersimpan (${entries.length} orang)`)
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menyimpan absensi'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = async (user: PublicUser) => {
    const saved = meeting.attendances.some((a) => a.userId === user.id)
    if (!saved) {
      setExtraUsers((prev) => prev.filter((u) => u.id !== user.id))
      setDraft((prev) => {
        const next = { ...prev }
        delete next[user.id]
        return next
      })
      return
    }
    if (!confirm(`Hapus data kehadiran ${user.name}?`)) return
    try {
      await meetingAPI.removeAttendance(meeting.id, user.id)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menghapus data kehadiran'))
    }
  }

  const handleAddParticipant = (user: User) => {
    setExtraUsers((prev) => [...prev, user])
    setStatus(user.id, 'hadir')
  }

  const handleCheckIn = async () => {
    setError('')
    try {
      await meetingAPI.checkIn(meeting.id)
      await load()
      setMessage('Kehadiran Anda tercatat. Jazakallahu khairan!')
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal absen'))
    }
  }

  const handleUpdate = async (data: MeetingInput) => {
    await meetingAPI.update(meeting.id, data)
    setIsEditing(false)
    await load()
  }

  const handleDelete = async () => {
    if (!confirm('Hapus pertemuan ini beserta seluruh data absensinya?')) return
    try {
      await meetingAPI.remove(meeting.id)
      navigate(backLink.to)
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menghapus pertemuan'))
    }
  }

  const c = meeting.counts
  const showCheckIn = meeting.canCheckIn && meeting.myAttendance?.status !== 'hadir'

  return (
    <div className="meeting-detail">
      <p>
        <Link to={backLink.to}>&larr; {backLink.label}</Link>
      </p>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <section className="activity-list section">
        <div className="page-header">
          <h2>{meeting.topic}</h2>
          <div className="actions">
            {showCheckIn && (
              <button className="btn-primary" onClick={handleCheckIn}>
                Saya Hadir
              </button>
            )}
            {meeting.canManage && !isEditing && (
              <>
                <button className="btn-secondary" onClick={() => setIsEditing(true)}>
                  Ubah
                </button>
                <button className="btn-danger" onClick={handleDelete}>
                  Hapus
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <MeetingForm
            initial={meeting}
            submitLabel="Simpan"
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <dl className="info-list">
            <dt>{meeting.group ? 'Halaqoh' : 'Kajian'}</dt>
            <dd>{meeting.group?.name ?? meeting.kajian?.title}</dd>
            <dt>Tanggal</dt>
            <dd>
              {formatDate(meeting.date)}
              {meeting.startTime && `, ${meeting.startTime}`}
            </dd>
            <dt>Pemateri</dt>
            <dd>{meeting.speaker || '-'}</dd>
            <dt>Tempat</dt>
            <dd>{meeting.location || '-'}</dd>
            {meeting.notes && (
              <>
                <dt>Catatan</dt>
                <dd className="pre-line">{meeting.notes}</dd>
              </>
            )}
            {meeting.myAttendance && (
              <>
                <dt>Kehadiran saya</dt>
                <dd>
                  <span className={`status status-${meeting.myAttendance.status}`}>
                    {ATTENDANCE_LABELS[meeting.myAttendance.status]}
                  </span>
                </dd>
              </>
            )}
          </dl>
        )}

        <div className="stats-grid attendance-counts">
          {ATTENDANCE_STATUSES.map((s) => (
            <div key={s} className={`count-card status-${s}`}>
              <span>{ATTENDANCE_LABELS[s]}</span>
              <strong>{c[s]}</strong>
            </div>
          ))}
        </div>
      </section>

      {(meeting.canManage || meeting.group) && (
        <section className="activity-list section">
          <div className="page-header">
            <h2>Absensi</h2>
            {meeting.canManage && rows.length > 0 && (
              <div className="actions">
                <button className="btn-secondary" onClick={markAllPresent}>
                  Tandai sisanya hadir
                </button>
                <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Menyimpan...' : 'Simpan Absensi'}
                </button>
              </div>
            )}
          </div>

          {meeting.canManage && !meeting.group && (
            <div className="add-member">
              <UserPicker excludeIds={rows.map((r) => r.user.id)} onSelect={handleAddParticipant} />
            </div>
          )}

          {rows.length === 0 ? (
            <p className="muted">
              {meeting.group ? 'Halaqoh belum punya anggota.' : 'Belum ada peserta tercatat.'}
            </p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Status</th>
                    <th>Keterangan</th>
                    {meeting.canManage && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ user, memberRole }) => {
                    const entry = draft[user.id]
                    const isFormer = !!meeting.group && memberRole === null
                    return (
                      <tr key={user.id}>
                        <td>
                          {user.name}
                          {memberRole === 'murabbi' && (
                            <span className="badge">{MEMBER_ROLE_LABELS.murabbi}</span>
                          )}
                          {isFormer && <span className="badge badge-muted">Bukan anggota</span>}
                        </td>
                        <td>
                          {meeting.canManage ? (
                            <div className="status-picker">
                              {ATTENDANCE_STATUSES.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  className={`status-option status-${s}${entry?.status === s ? ' selected' : ''}`}
                                  onClick={() => setStatus(user.id, s)}
                                >
                                  {ATTENDANCE_LABELS[s]}
                                </button>
                              ))}
                            </div>
                          ) : entry?.status ? (
                            <span className={`status status-${entry.status}`}>
                              {ATTENDANCE_LABELS[entry.status]}
                            </span>
                          ) : (
                            <span className="muted">Belum diisi</span>
                          )}
                        </td>
                        <td>
                          {meeting.canManage ? (
                            <input
                              className="note-input"
                              value={entry?.note ?? ''}
                              onChange={(e) => setNote(user.id, e.target.value)}
                              placeholder="opsional"
                            />
                          ) : (
                            entry?.note || ''
                          )}
                        </td>
                        {meeting.canManage && (
                          <td>
                            {(entry?.status || !meeting.group) && (
                              <button
                                className="btn-secondary btn-small"
                                onClick={() => handleRemove(user)}
                              >
                                Hapus
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
