import React, { useCallback, useEffect, useState } from 'react'
import type { MurabbiNote, MurabbiNoteInput, NoteCategory, NoteVisibility } from '@/types'
import { noteAPI } from '@/services/api'
import { formatDate, getErrorMessage, todayKey } from '@/utils/labels'

export const NOTE_CATEGORY_LABELS: Record<NoteCategory, string> = {
  catatan: 'Catatan',
  evaluasi: 'Evaluasi',
  apresiasi: 'Apresiasi',
}

const VISIBILITY_LABELS: Record<NoteVisibility, string> = {
  private: 'Hanya murabbi & pengurus',
  shared: 'Dibagikan ke anggota',
}

const emptyForm = (): MurabbiNoteInput => ({
  date: todayKey(),
  category: 'catatan',
  content: '',
  visibility: 'private',
})

interface MurabbiNotesProps {
  groupId: number
  memberId: number
  memberName?: string
}

// Catatan / evaluasi murabbi untuk satu anggota halaqoh
export const MurabbiNotes: React.FC<MurabbiNotesProps> = ({ groupId, memberId, memberName }) => {
  const [notes, setNotes] = useState<MurabbiNote[]>([])
  const [canManage, setCanManage] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [form, setForm] = useState<MurabbiNoteInput>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await noteAPI.getMemberNotes(groupId, memberId)
      setNotes(data.notes)
      setCanManage(data.canManage)
    } catch (err: any) {
      // Bukan murabbi halaqoh ini dan bukan anggota yang bersangkutan: sembunyikan bagian catatan
      if (err.response?.status === 403) setHidden(true)
      else setError(getErrorMessage(err, 'Gagal memuat catatan murabbi'))
    }
  }, [groupId, memberId])

  useEffect(() => {
    load()
  }, [load])

  if (hidden) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSaving(true)
    try {
      if (editingId) await noteAPI.update(editingId, form)
      else await noteAPI.create(groupId, memberId, form)
      setForm(emptyForm())
      setEditingId(null)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menyimpan catatan'))
    } finally {
      setIsSaving(false)
    }
  }

  const startEdit = (note: MurabbiNote) => {
    setEditingId(note.id)
    setForm({
      date: note.date,
      category: note.category,
      content: note.content,
      visibility: note.visibility,
    })
  }

  const handleDelete = async (note: MurabbiNote) => {
    if (!confirm('Hapus catatan ini?')) return
    try {
      await noteAPI.remove(note.id)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menghapus catatan'))
    }
  }

  return (
    <section className="activity-list section no-print" id="catatan">
      <h2>Catatan Murabbi{memberName ? ` untuk ${memberName}` : ''}</h2>
      {canManage && (
        <p className="muted">
          Catatan "Hanya murabbi & pengurus" tidak terlihat oleh anggota. Pilih "Dibagikan ke
          anggota" untuk nasihat atau apresiasi yang ingin disampaikan.
        </p>
      )}

      {error && <div className="error">{error}</div>}

      {canManage && (
        <form onSubmit={handleSubmit} className="activity-form form-grid section">
          <div>
            <label>Tanggal</label>
            <input
              type="date"
              value={form.date}
              max={todayKey()}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>
          <div>
            <label>Jenis</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as NoteCategory })}
            >
              {Object.entries(NOTE_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="span-2">
            <label>Isi catatan</label>
            <textarea
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="mis. Tilawah pekan ini meningkat, perlu dijaga sholat dhuhanya."
              maxLength={5000}
              required
            />
          </div>
          <div className="span-2">
            <label>Siapa yang bisa melihat</label>
            <select
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value as NoteVisibility })}
            >
              {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="actions span-2">
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Catatan'}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm())
                }}
              >
                Batal
              </button>
            )}
          </div>
        </form>
      )}

      {notes.length === 0 ? (
        <p className="muted">Belum ada catatan.</p>
      ) : (
        <ul className="note-list">
          {notes.map((note) => (
            <li key={note.id} className={`note-item note-${note.category}`}>
              <div className="note-meta">
                <span className="badge">{NOTE_CATEGORY_LABELS[note.category]}</span>
                {canManage && (
                  <span className="badge badge-muted">{VISIBILITY_LABELS[note.visibility]}</span>
                )}
                <span className="muted">
                  {formatDate(note.date)}
                  {note.author && ` · ${note.author.name}`}
                </span>
              </div>
              <p className="pre-line">{note.content}</p>
              {note.canEdit && (
                <div className="actions">
                  <button className="btn-small" onClick={() => startEdit(note)}>
                    Ubah
                  </button>
                  <button className="btn-small btn-danger" onClick={() => handleDelete(note)}>
                    Hapus
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
