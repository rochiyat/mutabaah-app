import React, { useEffect, useState } from 'react'
import type { ActivityTemplate, ActivityTemplateInput, TemplateItem } from '@/types'
import { templateAPI } from '@/services/api'
import { getErrorMessage } from '@/utils/labels'

const emptyItem = (): TemplateItem => ({
  name: '',
  category: '',
  target: 1,
  unit: 'kali',
  isRequired: false,
})

const emptyForm = (): ActivityTemplateInput => ({ name: '', description: '', items: [emptyItem()] })

export const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<ActivityTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<ActivityTemplateInput | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const load = async () => {
    try {
      setTemplates((await templateAPI.getList()).data)
      setError('')
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal memuat template'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const setItem = (index: number, patch: Partial<TemplateItem>) =>
    form &&
    setForm({ ...form, items: form.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    setError('')
    setIsSaving(true)
    const data = {
      ...form,
      description: form.description || null,
      items: form.items
        .filter((it) => it.name.trim())
        .map((it) => ({ ...it, category: it.category.trim() || 'Lainnya' })),
    }
    try {
      if (editingId) await templateAPI.update(editingId, data)
      else await templateAPI.create(data)
      setForm(null)
      setEditingId(null)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menyimpan template'))
    } finally {
      setIsSaving(false)
    }
  }

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    setError('')
    try {
      await action()
      await load()
    } catch (err) {
      setError(getErrorMessage(err, fallback))
    }
  }

  return (
    <div className="activity-list">
      <div className="page-header">
        <h2>Template Amalan</h2>
        {!form && (
          <button
            className="btn-primary"
            onClick={() => {
              setEditingId(null)
              setForm(emptyForm())
            }}
          >
            Buat Template
          </button>
        )}
      </div>
      <p className="muted section">
        Paket amalan dan target yang bisa dipasang ke halaqoh sekali klik, dari halaman detail
        halaqoh bagian Amalan Halaqoh.
      </p>

      {error && <div className="error">{error}</div>}

      {form && (
        <form onSubmit={handleSubmit} className="activity-form section">
          <div>
            <label>Nama template</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="mis. Mutaba'ah Yaumiyah Pemula"
              required
            />
          </div>
          <div>
            <label>Keterangan (opsional)</label>
            <textarea
              rows={2}
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <label>Daftar amalan</label>
          <div className="table-wrap">
            <table className="table template-items">
              <thead>
                <tr>
                  <th>Nama amalan</th>
                  <th>Kategori</th>
                  <th>Target/hari</th>
                  <th>Satuan</th>
                  <th>Wajib</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        value={item.name}
                        onChange={(e) => setItem(i, { name: e.target.value })}
                        placeholder="mis. Tilawah"
                      />
                    </td>
                    <td>
                      <input
                        value={item.category}
                        onChange={(e) => setItem(i, { category: e.target.value })}
                        placeholder="mis. Al-Qur'an"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={item.target}
                        onChange={(e) => setItem(i, { target: parseInt(e.target.value) || 1 })}
                      />
                    </td>
                    <td>
                      <input value={item.unit} onChange={(e) => setItem(i, { unit: e.target.value })} />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.isRequired}
                        onChange={(e) => setItem(i, { isRequired: e.target.checked })}
                      />
                    </td>
                    <td>
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          className="btn-small btn-danger"
                          onClick={() =>
                            setForm({ ...form, items: form.items.filter((_, j) => j !== i) })
                          }
                        >
                          Hapus
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}
            >
              + Tambah baris
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : 'Simpan Template'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setForm(null)
                setEditingId(null)
              }}
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="loading">Memuat...</div>
      ) : templates.length === 0 ? (
        <p className="muted">Belum ada template.</p>
      ) : (
        <div className="activities">
          {templates.map((t) => (
            <div key={t.id} className={`activity-card ${t.isActive ? '' : 'inactive'}`}>
              <h3>
                {t.name}
                {!t.isActive && <span className="badge badge-muted">Nonaktif</span>}
              </h3>
              {t.description && <p>{t.description}</p>}
              <ul className="template-item-list">
                {t.items.map((item, i) => (
                  <li key={i}>
                    {item.name} · {item.target} {item.unit}
                    {item.isRequired && <span className="badge">Wajib</span>}
                  </li>
                ))}
              </ul>
              <p className="muted">{t.createdBy ? `Dibuat oleh ${t.createdBy.name}` : 'Template bawaan'}</p>
              {t.canManage && (
                <div className="actions">
                  <button
                    className="btn-small"
                    onClick={() => {
                      setEditingId(t.id)
                      setForm({ name: t.name, description: t.description ?? '', items: t.items })
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >
                    Ubah
                  </button>
                  <button
                    className="btn-small"
                    onClick={() =>
                      run(() => templateAPI.update(t.id, { isActive: !t.isActive }), 'Gagal mengubah template')
                    }
                  >
                    {t.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    className="btn-small btn-danger"
                    onClick={() =>
                      confirm(`Hapus template "${t.name}"? Amalan yang sudah dipasang ke halaqoh tetap ada.`) &&
                      run(() => templateAPI.remove(t.id), 'Gagal menghapus template')
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
    </div>
  )
}
