import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type {
  GroupDetail,
  GroupInput,
  GroupMemberRole,
  Meeting,
  MeetingInput,
  User,
} from '@/types'
import { groupAPI, groupActivityAPI } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { GroupForm } from '@/components/halaqoh/GroupForm'
import { UserPicker } from '@/components/users/UserPicker'
import { MeetingForm } from '@/components/meetings/MeetingForm'
import { MeetingList } from '@/components/meetings/MeetingList'
import { MEMBER_ROLE_LABELS, getErrorMessage, isManagerRole } from '@/utils/labels'

export const HalaqohDetailPage: React.FC = () => {
  const { id } = useParams()
  const groupId = Number(id)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [showMeetingForm, setShowMeetingForm] = useState(false)

  const [newMember, setNewMember] = useState<User | null>(null)
  const [newMemberRole, setNewMemberRole] = useState<GroupMemberRole>('mutarabbi')

  const [activityName, setActivityName] = useState('')
  const [activityCategory, setActivityCategory] = useState('')
  const [activityTarget, setActivityTarget] = useState('1')
  const [activityUnit, setActivityUnit] = useState('kali')
  const [activityRequired, setActivityRequired] = useState(true)

  const load = useCallback(async () => {
    try {
      const [response, meetingsResponse] = await Promise.all([
        groupAPI.getGroupById(groupId),
        groupAPI.getMeetings(groupId),
      ])
      setGroup(response.data)
      setMeetings(meetingsResponse.data)
      setError('')
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal memuat halaqoh'))
    } finally {
      setIsLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    load()
  }, [load])

  // Jalankan aksi, tampilkan error bila gagal, lalu muat ulang data
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
  if (!group) return <div className="error">{error || 'Halaqoh tidak ditemukan'}</div>

  const isOwner = group.adminId === user?.id || isManagerRole(user?.roles)
  const isMember = group.members.some((m) => m.userId === user?.id)
  const murabbiMembers = group.members.filter((m) => m.role === 'murabbi')

  const handleUpdate = async (data: GroupInput) => {
    await groupAPI.updateGroup(group.id, data)
    setIsEditing(false)
    await load()
  }

  const handleDelete = async () => {
    if (!confirm(`Hapus halaqoh "${group.name}"? Semua keanggotaan akan dihapus.`)) return
    try {
      await groupAPI.deleteGroup(group.id)
      navigate('/halaqoh')
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menghapus halaqoh'))
    }
  }

  const handleAddMember = () =>
    newMember &&
    run(async () => {
      await groupAPI.addMember(group.id, newMember.id, newMemberRole)
      setNewMember(null)
      setNewMemberRole('mutarabbi')
    }, 'Gagal menambah anggota')

  const handleLeave = async () => {
    if (!user || !confirm('Keluar dari halaqoh ini?')) return
    try {
      await groupAPI.removeMember(group.id, user.id)
      navigate('/halaqoh')
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal keluar dari halaqoh'))
    }
  }

  const handleCreateMeeting = async (data: MeetingInput) => {
    const response = await groupAPI.createMeeting(group.id, data)
    navigate(`/pertemuan/${response.data.id}`)
  }

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault()
    run(async () => {
      await groupActivityAPI.createActivity(group.id, {
        name: activityName,
        category: activityCategory,
        target: parseInt(activityTarget) || 1,
        unit: activityUnit || 'kali',
        isRequired: activityRequired,
      })
      setActivityName('')
      setActivityCategory('')
      setActivityTarget('1')
      setActivityUnit('kali')
    }, 'Gagal menambah amalan')
  }

  return (
    <div className="halaqoh-detail">
      <p>
        <Link to="/halaqoh">&larr; Semua halaqoh</Link>
      </p>

      {error && <div className="error">{error}</div>}

      <section className="activity-list section">
        <div className="page-header">
          <h2>
            {group.name}{' '}
            {!group.isActive && <span className="badge badge-muted">Nonaktif</span>}
          </h2>
          <div className="actions">
            {group.canManage && !isEditing && (
              <button className="btn-secondary" onClick={() => setIsEditing(true)}>
                Ubah
              </button>
            )}
            {isOwner && (
              <button className="btn-danger" onClick={handleDelete}>
                Hapus
              </button>
            )}
            {isMember && group.adminId !== user?.id && (
              <button className="btn-secondary" onClick={handleLeave}>
                Keluar
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <GroupForm
            initial={group}
            submitLabel="Simpan"
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <dl className="info-list">
            <dt>Penanggung jawab</dt>
            <dd>{group.admin?.name ?? '-'}</dd>
            <dt>Jenjang</dt>
            <dd>{group.level || '-'}</dd>
            <dt>Jadwal</dt>
            <dd>{group.schedule || '-'}</dd>
            <dt>Tempat</dt>
            <dd>{group.location || '-'}</dd>
            {group.description && (
              <>
                <dt>Keterangan</dt>
                <dd className="pre-line">{group.description}</dd>
              </>
            )}
          </dl>
        )}

        {isOwner && murabbiMembers.length > 1 && !isEditing && (
          <div className="inline-form">
            <label>Ganti penanggung jawab:</label>
            <select
              value={group.adminId}
              onChange={(e) =>
                run(
                  () => groupAPI.updateGroup(group.id, { adminId: Number(e.target.value) }),
                  'Gagal mengganti penanggung jawab'
                )
              }
            >
              {murabbiMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section className="activity-list section">
        <div className="page-header">
          <h2>Pertemuan ({meetings.length})</h2>
          {group.canManage && (
            <button className="btn-primary" onClick={() => setShowMeetingForm(!showMeetingForm)}>
              {showMeetingForm ? 'Batal' : 'Tambah Pertemuan'}
            </button>
          )}
        </div>
        {showMeetingForm && (
          <MeetingForm
            defaults={{ location: group.location }}
            submitLabel="Buat Pertemuan"
            onSubmit={handleCreateMeeting}
            onCancel={() => setShowMeetingForm(false)}
          />
        )}
        <MeetingList meetings={meetings} expected={group.members.length} />
      </section>

      <section className="activity-list section">
        <h2>Anggota ({group.members.length})</h2>

        {group.canManage && (
          <div className="add-member">
            {newMember ? (
              <div className="inline-form">
                <span>
                  <strong>{newMember.name}</strong> ({newMember.email})
                </span>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as GroupMemberRole)}
                >
                  <option value="mutarabbi">Mutarabbi</option>
                  <option value="murabbi">Murabbi</option>
                </select>
                <button className="btn-primary" onClick={handleAddMember}>
                  Tambah
                </button>
                <button className="btn-secondary" onClick={() => setNewMember(null)}>
                  Batal
                </button>
              </div>
            ) : (
              <UserPicker
                excludeIds={group.members.map((m) => m.userId)}
                onSelect={setNewMember}
              />
            )}
          </div>
        )}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Peran</th>
                {group.canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {group.members.map((m) => {
                const isAdmin = m.userId === group.adminId
                return (
                  <tr key={m.userId}>
                    <td>
                      {m.user.name}
                      {isAdmin && <span className="badge">Penanggung jawab</span>}
                      {!m.user.isActive && <span className="badge badge-muted">Nonaktif</span>}
                    </td>
                    <td>{m.user.email}</td>
                    <td>
                      {group.canManage && !isAdmin ? (
                        <select
                          value={m.role}
                          onChange={(e) =>
                            run(
                              () =>
                                groupAPI.updateMember(
                                  group.id,
                                  m.userId,
                                  e.target.value as GroupMemberRole
                                ),
                              'Gagal mengubah peran'
                            )
                          }
                        >
                          <option value="mutarabbi">Mutarabbi</option>
                          <option value="murabbi">Murabbi</option>
                        </select>
                      ) : (
                        MEMBER_ROLE_LABELS[m.role]
                      )}
                    </td>
                    {group.canManage && (
                      <td>
                        {!isAdmin && (
                          <button
                            className="btn-danger btn-small"
                            onClick={() =>
                              confirm(`Keluarkan ${m.user.name} dari halaqoh?`) &&
                              run(
                                () => groupAPI.removeMember(group.id, m.userId),
                                'Gagal mengeluarkan anggota'
                              )
                            }
                          >
                            Keluarkan
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
      </section>

      <section className="activity-list section">
        <h2>Amalan Halaqoh ({group.activities.length})</h2>
        <p className="muted">
          Amalan ini otomatis muncul di checklist harian semua anggota halaqoh.
        </p>

        {group.canManage && (
          <form onSubmit={handleAddActivity} className="activity-form form-grid">
            <div>
              <label>Nama Amalan</label>
              <input
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                placeholder="mis. Tilawah"
                required
              />
            </div>
            <div>
              <label>Kategori</label>
              <input
                value={activityCategory}
                onChange={(e) => setActivityCategory(e.target.value)}
                placeholder="mis. Ibadah harian"
                required
              />
            </div>
            <div>
              <label>Target per hari</label>
              <input
                type="number"
                min="1"
                value={activityTarget}
                onChange={(e) => setActivityTarget(e.target.value)}
              />
            </div>
            <div>
              <label>Satuan</label>
              <input value={activityUnit} onChange={(e) => setActivityUnit(e.target.value)} />
            </div>
            <label className="checkbox span-2">
              <input
                type="checkbox"
                checked={activityRequired}
                onChange={(e) => setActivityRequired(e.target.checked)}
              />
              Wajib
            </label>
            <div className="actions span-2">
              <button type="submit" className="btn-primary">
                Tambah Amalan
              </button>
            </div>
          </form>
        )}

        {group.activities.length === 0 ? (
          <p className="muted">Belum ada amalan halaqoh.</p>
        ) : (
          <div className="activities">
            {group.activities.map((ga) => (
              <div key={ga.activityId} className="activity-card">
                <h3>
                  {ga.activity?.name}{' '}
                  {ga.isRequired && <span className="badge">Wajib</span>}
                  {ga.activity && !ga.activity.isActive && (
                    <span className="badge badge-muted">Nonaktif</span>
                  )}
                </h3>
                <p>Kategori: {ga.activity?.category}</p>
                <p>
                  Target: {ga.activity?.target} {ga.activity?.unit} / hari
                </p>
                {group.canManage && (
                  <div className="actions">
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={ga.isRequired}
                        onChange={(e) =>
                          run(
                            () =>
                              groupActivityAPI.updateActivity(group.id, ga.activityId, {
                                isRequired: e.target.checked,
                              }),
                            'Gagal mengubah amalan'
                          )
                        }
                      />
                      Wajib
                    </label>
                    <button
                      className="btn-danger btn-small"
                      onClick={() =>
                        confirm(`Hapus amalan "${ga.activity?.name}" dari halaqoh?`) &&
                        run(
                          () => groupActivityAPI.removeActivity(group.id, ga.activityId),
                          'Gagal menghapus amalan'
                        )
                      }
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
