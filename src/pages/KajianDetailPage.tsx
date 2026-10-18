import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { KajianDetail, KajianInput, MeetingInput } from '@/types'
import { kajianAPI } from '@/services/api'
import { KajianForm } from '@/components/kajian/KajianForm'
import { MeetingForm } from '@/components/meetings/MeetingForm'
import { MeetingList } from '@/components/meetings/MeetingList'
import { getErrorMessage } from '@/utils/labels'

export const KajianDetailPage: React.FC = () => {
  const { id } = useParams()
  const kajianId = Number(id)
  const navigate = useNavigate()

  const [kajian, setKajian] = useState<KajianDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [showMeetingForm, setShowMeetingForm] = useState(false)

  const load = useCallback(async () => {
    try {
      const response = await kajianAPI.getById(kajianId)
      setKajian(response.data)
      setError('')
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal memuat kajian'))
    } finally {
      setIsLoading(false)
    }
  }, [kajianId])

  useEffect(() => {
    load()
  }, [load])

  if (isLoading) return <div className="loading">Memuat...</div>
  if (!kajian) return <div className="error">{error || 'Kajian tidak ditemukan'}</div>

  const handleUpdate = async (data: KajianInput) => {
    await kajianAPI.update(kajian.id, data)
    setIsEditing(false)
    await load()
  }

  const handleDelete = async () => {
    if (!confirm(`Hapus kajian "${kajian.title}" beserta semua sesi dan absensinya?`)) return
    try {
      await kajianAPI.remove(kajian.id)
      navigate('/kajian')
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menghapus kajian'))
    }
  }

  const handleCreateMeeting = async (data: MeetingInput) => {
    const response = await kajianAPI.createMeeting(kajian.id, data)
    navigate(`/pertemuan/${response.data.id}`)
  }

  return (
    <div className="kajian-detail">
      <p>
        <Link to="/kajian">&larr; Semua kajian</Link>
      </p>

      {error && <div className="error">{error}</div>}

      <section className="activity-list section">
        <div className="page-header">
          <h2>
            {kajian.title}{' '}
            {!kajian.isActive && <span className="badge badge-muted">Nonaktif</span>}
          </h2>
          {kajian.canManage && !isEditing && (
            <div className="actions">
              <button className="btn-secondary" onClick={() => setIsEditing(true)}>
                Ubah
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                Hapus
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <KajianForm
            initial={kajian}
            submitLabel="Simpan"
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <dl className="info-list">
            <dt>Pemateri</dt>
            <dd>{kajian.speaker || '-'}</dd>
            <dt>Jadwal</dt>
            <dd>{kajian.schedule || '-'}</dd>
            <dt>Tempat</dt>
            <dd>{kajian.location || '-'}</dd>
            <dt>Pengelola</dt>
            <dd>{kajian.createdBy?.name ?? '-'}</dd>
            {kajian.description && (
              <>
                <dt>Keterangan</dt>
                <dd className="pre-line">{kajian.description}</dd>
              </>
            )}
          </dl>
        )}
      </section>

      <section className="activity-list section">
        <div className="page-header">
          <h2>Sesi Kajian ({kajian.meetings.length})</h2>
          {kajian.canManage && (
            <button className="btn-primary" onClick={() => setShowMeetingForm(!showMeetingForm)}>
              {showMeetingForm ? 'Batal' : 'Tambah Sesi'}
            </button>
          )}
        </div>
        {showMeetingForm && (
          <MeetingForm
            defaults={{ speaker: kajian.speaker, location: kajian.location }}
            submitLabel="Buat Sesi"
            onSubmit={handleCreateMeeting}
            onCancel={() => setShowMeetingForm(false)}
          />
        )}
        <MeetingList meetings={kajian.meetings} />
      </section>
    </div>
  )
}
