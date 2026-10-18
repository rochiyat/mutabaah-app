import React, { useEffect, useState } from 'react'
import type { AuditLogPage as AuditLogPageData } from '@/types'
import { auditAPI } from '@/services/api'
import { getErrorMessage } from '@/utils/labels'

const ENTITY_LABELS: Record<string, string> = {
  user: 'User',
  group: 'Halaqoh',
  note: 'Catatan murabbi',
  template: 'Template amalan',
  kajian: 'Kajian',
  meeting: 'Pertemuan',
  financeAccount: 'Kas',
  transaction: 'Transaksi',
  duesPlan: 'Iuran',
  program: 'Program',
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export const AuditLogPage: React.FC = () => {
  const [data, setData] = useState<AuditLogPageData | null>(null)
  const [page, setPage] = useState(1)
  const [entityType, setEntityType] = useState('')
  const [search, setSearch] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await auditAPI.getLogs({
          page,
          entityType: entityType || undefined,
          search: search.trim() || undefined,
          start: start || undefined,
          end: end || undefined,
        })
        setData(response.data)
        setError('')
      } catch (err) {
        setError(getErrorMessage(err, 'Gagal memuat log aktivitas'))
      } finally {
        setIsLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [page, entityType, search, start, end])

  // Filter berubah -> kembali ke halaman pertama
  const withReset = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setPage(1)
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div className="activity-list">
      <div className="page-header">
        <h2>Log Aktivitas Pengurus</h2>
      </div>
      <p className="muted section">
        Mencatat perubahan oleh pengurus, murabbi, operator, dan bendahara: kelola user, halaqoh,
        kajian, absensi, keuangan, dan program.
      </p>

      <div className="report-controls">
        <select value={entityType} onChange={(e) => withReset(setEntityType)(e.target.value)}>
          <option value="">Semua jenis</option>
          {Object.entries(ENTITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          className="search-input"
          value={search}
          onChange={(e) => withReset(setSearch)(e.target.value)}
          placeholder="Cari aktivitas, mis. role"
        />
        <div className="period-picker">
          <label>
            Dari{' '}
            <input type="date" value={start} max={end || undefined} onChange={(e) => withReset(setStart)(e.target.value)} />
          </label>
          <label>
            s.d.{' '}
            <input type="date" value={end} min={start || undefined} onChange={(e) => withReset(setEnd)(e.target.value)} />
          </label>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {isLoading && !data ? (
        <div className="loading">Memuat...</div>
      ) : data && data.items.length === 0 ? (
        <p className="muted">Belum ada aktivitas yang tercatat.</p>
      ) : (
        data && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Oleh</th>
                  <th>Aktivitas</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((log) => (
                  <tr key={log.id}>
                    <td className="nowrap">{formatDateTime(log.createdAt)}</td>
                    <td>
                      {log.actor ? (
                        <>
                          {log.actor.name}
                          <div className="muted">{log.actor.email}</div>
                        </>
                      ) : (
                        <span className="muted">User terhapus</span>
                      )}
                    </td>
                    <td>
                      {log.summary}
                      {log.entityType && (
                        <span className="badge badge-muted">
                          {ENTITY_LABELS[log.entityType] ?? log.entityType}
                          {log.entityId !== null && ` #${log.entityId}`}
                        </span>
                      )}
                    </td>
                    <td>
                      <details className="audit-detail">
                        <summary>
                          <code>
                            {log.method} {log.path}
                          </code>
                        </summary>
                        <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                        {log.ip && <div className="muted">IP: {log.ip}</div>}
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {data && data.total > data.pageSize && (
        <div className="actions pagination">
          <button className="btn-small" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Sebelumnya
          </button>
          <span className="muted">
            Halaman {page} dari {totalPages} ({data.total} catatan)
          </span>
          <button
            className="btn-small"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Berikutnya
          </button>
        </div>
      )}
    </div>
  )
}
