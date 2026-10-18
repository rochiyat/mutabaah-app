import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ActivityTemplate } from '@/types'
import { templateAPI } from '@/services/api'
import { getErrorMessage } from '@/utils/labels'

interface TemplatePickerProps {
  groupId: number
  groupName: string
  hasActivities: boolean
  onApplied: () => void
}

// Pasang template amalan ke halaqoh, atau simpan amalan halaqoh ini sebagai template baru
export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  groupId,
  groupName,
  hasActivities,
  onApplied,
}) => {
  const [templates, setTemplates] = useState<ActivityTemplate[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const loadTemplates = () =>
    templateAPI
      .getList()
      .then((res) => setTemplates(res.data.filter((t) => t.isActive)))
      .catch((err) => setError(getErrorMessage(err, 'Gagal memuat template')))

  useEffect(() => {
    loadTemplates()
  }, [])

  const selected = templates.find((t) => t.id === Number(selectedId))

  const handleApply = async () => {
    if (!selected) return
    setError('')
    setMessage('')
    setIsBusy(true)
    try {
      const { data } = await templateAPI.applyToGroup(groupId, selected.id)
      setMessage(
        `${data.added} amalan ditambahkan` +
          (data.skipped ? `, ${data.skipped} dilewati karena sudah ada.` : '.')
      )
      setSelectedId('')
      onApplied()
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal memasang template'))
    } finally {
      setIsBusy(false)
    }
  }

  const handleSaveAsTemplate = async () => {
    const name = prompt('Nama template baru:', `Amalan ${groupName}`)
    if (!name?.trim()) return
    setError('')
    setMessage('')
    setIsBusy(true)
    try {
      await templateAPI.fromGroup(groupId, name.trim())
      setMessage(`Template "${name.trim()}" tersimpan.`)
      await loadTemplates()
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menyimpan template'))
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="template-picker section">
      <div className="inline-form">
        <label>Pakai template:</label>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">Pilih template amalan</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.items.length} amalan)
            </option>
          ))}
        </select>
        <button className="btn-primary" onClick={handleApply} disabled={!selected || isBusy}>
          Pasang
        </button>
        {hasActivities && (
          <button className="btn-secondary" onClick={handleSaveAsTemplate} disabled={isBusy}>
            Simpan sebagai template
          </button>
        )}
        <Link to="/template-amalan" className="muted">
          Kelola template
        </Link>
      </div>
      {selected && (
        <p className="muted">
          {selected.description && `${selected.description} `}Isi:{' '}
          {selected.items.map((i) => `${i.name} (${i.target} ${i.unit})`).join(', ')}
        </p>
      )}
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}
    </div>
  )
}
