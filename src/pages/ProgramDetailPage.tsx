import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { ProgramDetail, ProgramInput, ProgramParticipantRole, User } from '@/types'
import { programAPI } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { ProgramForm } from '@/components/programs/ProgramForm'
import { UserPicker } from '@/components/users/UserPicker'
import { Progress } from '@/components/reports/Progress'
import { ProgramDates } from '@/pages/ProgramsPage'
import { PROGRAM_STATUS_LABELS, formatDate, formatMoney, getErrorMessage } from '@/utils/labels'

export const ProgramDetailPage: React.FC = () => {
  const { id } = useParams()
  const programId = Number(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [program, setProgram] = useState<ProgramDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [newRole, setNewRole] = useState<ProgramParticipantRole>('peserta')

  const load = useCallback(async () => {
    try {
      const response = await programAPI.getById(programId)
      setProgram(response.data)
      setError('')
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal memuat program'))
    } finally {
      setIsLoading(false)
    }
  }, [programId])

  useEffect(() => {
    load()
  }, [load])

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    setError('')
    try {
      await action()
      await load()
    } catch (err) {
      setError(getErrorMessage(err, fallback))
    }
  }

  if (isLoading) return <div>Loading...</div>
  if (!program) return <div className="error">{error || 'Program tidak ditemukan'}</div>

  const handleUpdate = async (data: ProgramInput) => {
    await programAPI.update(program.id, data)
    setIsEditing(false)
    await load()
  }

  const handleDelete = async () => {
    if (!confirm(`Hapus program "${program.name}"? Transaksi yang ditautkan tetap tersimpan di kas.`)) return
    try {
      await programAPI.remove(program.id)
      navigate('/program')
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menghapus program'))
    }
  }

  const f = program.finance
  const budgetPercent = f.budget ? Math.round((f.realization / f.budget) * 1000) / 10 : null
  const registrationOpen = program.status === 'rencana' || program.status === 'berjalan'

  return (
    <div className="program-detail">
      <p className="no-print">
        <Link to="/program">&larr; Semua program</Link>
      </p>

      {error && <div className="error">{error}</div>}

      <section className="activity-list section">
        <div className="page-header">
          <h2>
            {program.name}{' '}
            <span className={`badge status-badge-${program.status}`}>{PROGRAM_STATUS_LABELS[program.status]}</span>
          </h2>
          <div className="actions">
            {!program.myParticipation && registrationOpen && (
              <button className="btn-primary" onClick={() => run(() => programAPI.join(program.id), 'Gagal mendaftar')}>
                Daftar
              </button>
            )}
            {program.myParticipation && (
              <button
                className="btn-secondary"
                onClick={() =>
                  confirm('Batalkan keikutsertaan Anda?') &&
                  run(() => programAPI.removeParticipant(program.id, user!.id), 'Gagal membatalkan')
                }
              >
                Batal ikut
              </button>
            )}
            {program.canManage && !isEditing && (
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
          <ProgramForm
            initial={program}
            submitLabel="Simpan"
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <dl className="info-list">
            <dt>Milik</dt>
            <dd>{program.group ? `Halaqoh ${program.group.name}` : 'Lembaga'}</dd>
            <dt>Waktu</dt>
            <dd>
              {program.startDate || program.endDate ? (
                <ProgramDates start={program.startDate} end={program.endDate} />
              ) : (
                '-'
              )}
            </dd>
            <dt>Tempat</dt>
            <dd>{program.location || '-'}</dd>
            <dt>Penanggung jawab</dt>
            <dd>{program.pic?.name ?? '-'}</dd>
            {program.description && (
              <>
                <dt>Deskripsi</dt>
                <dd className="pre-line">{program.description}</dd>
              </>
            )}
          </dl>
        )}
      </section>

      <section className="activity-list section">
        <h2>Keuangan Program</h2>
        <div className="stats-grid money-cards">
          <div className="count-card">
            <span>Anggaran</span>
            <strong>{f.budget != null ? formatMoney(f.budget) : '-'}</strong>
          </div>
          <div className="count-card money-out">
            <span>Realisasi (pengeluaran)</span>
            <strong>{formatMoney(f.realization)}</strong>
          </div>
          <div className="count-card money-in">
            <span>Pemasukan</span>
            <strong>{formatMoney(f.masuk)}</strong>
          </div>
          <div className="count-card">
            <span>Sisa anggaran</span>
            <strong>{f.budget != null ? formatMoney(f.budget - f.realization) : '-'}</strong>
          </div>
        </div>
        {budgetPercent !== null && (
          <div className="budget-bar">
            <span className="muted">Penyerapan anggaran</span>
            <Progress percent={budgetPercent} />
          </div>
        )}
        <p className="muted">
          Angka diambil dari transaksi kas yang ditautkan ke program ini (pilih program saat mencatat
          transaksi di menu Keuangan).
        </p>
        {program.canManage && program.transactions.length > 0 && (
          <div className="table-wrap">
            <table className="table report-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Kas</th>
                  <th>Kategori</th>
                  <th>Keterangan</th>
                  <th className="num">Masuk</th>
                  <th className="num">Keluar</th>
                </tr>
              </thead>
              <tbody>
                {program.transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDate(t.date)}</td>
                    <td>{t.account && <Link to={`/keuangan/${t.account.id}`}>{t.account.name}</Link>}</td>
                    <td>{t.category}</td>
                    <td className="wrap">{t.description || '-'}</td>
                    <td className="num money-in-text">{t.type === 'masuk' ? formatMoney(t.amount) : ''}</td>
                    <td className="num money-out-text">{t.type === 'keluar' ? formatMoney(t.amount) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="activity-list section">
        <h2>Panitia & Peserta ({program.participants.length})</h2>
        {program.canManage && (
          <div className="add-member inline-form">
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as ProgramParticipantRole)}>
              <option value="peserta">Tambah sebagai peserta</option>
              <option value="panitia">Tambah sebagai panitia</option>
            </select>
            <UserPicker
              excludeIds={program.participants.map((p) => p.userId)}
              onSelect={(u: User) =>
                run(() => programAPI.addParticipant(program.id, u.id, newRole), 'Gagal menambahkan')
              }
            />
          </div>
        )}
        {program.participants.length === 0 ? (
          <p className="muted">Belum ada yang terdaftar.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Peran</th>
                  <th>Terdaftar</th>
                  {program.canManage && <th></th>}
                </tr>
              </thead>
              <tbody>
                {program.participants.map((p) => (
                  <tr key={p.userId}>
                    <td>{p.user.name}</td>
                    <td>
                      {program.canManage ? (
                        <select
                          value={p.role}
                          onChange={(e) =>
                            run(
                              () =>
                                programAPI.updateParticipant(
                                  program.id,
                                  p.userId,
                                  e.target.value as ProgramParticipantRole
                                ),
                              'Gagal mengubah peran'
                            )
                          }
                        >
                          <option value="peserta">Peserta</option>
                          <option value="panitia">Panitia</option>
                        </select>
                      ) : p.role === 'panitia' ? (
                        'Panitia'
                      ) : (
                        'Peserta'
                      )}
                    </td>
                    <td>{formatDate(p.joinedAt.slice(0, 10))}</td>
                    {program.canManage && (
                      <td>
                        <button
                          className="btn-danger btn-small"
                          onClick={() =>
                            confirm(`Keluarkan ${p.user.name}?`) &&
                            run(() => programAPI.removeParticipant(program.id, p.userId), 'Gagal mengeluarkan')
                          }
                        >
                          Keluarkan
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
