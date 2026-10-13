import React from 'react'
import { Link } from 'react-router-dom'
import type { Meeting } from '@/types'
import { formatDate } from '@/utils/labels'

interface MeetingListProps {
  meetings: Meeting[]
  // Jumlah peserta seharusnya (anggota halaqoh); kosong untuk kajian umum
  expected?: number
}

export const MeetingList: React.FC<MeetingListProps> = ({ meetings, expected }) => {
  if (meetings.length === 0) return <p className="muted">Belum ada pertemuan.</p>

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Materi</th>
            <th>Pemateri</th>
            <th>Kehadiran</th>
          </tr>
        </thead>
        <tbody>
          {meetings.map((m) => {
            const c = m.counts
            return (
              <tr key={m.id}>
                <td>
                  <Link to={`/pertemuan/${m.id}`}>{formatDate(m.date)}</Link>
                  {m.startTime && <span className="muted"> {m.startTime}</span>}
                </td>
                <td>
                  <Link to={`/pertemuan/${m.id}`}>{m.topic}</Link>
                </td>
                <td>{m.speaker || '-'}</td>
                <td>
                  {c ? (
                    <span className="attendance-summary">
                      <strong>{c.hadir}</strong>
                      {expected !== undefined && ` / ${expected}`} hadir
                      {c.izin + c.sakit + c.alpa > 0 && (
                        <span className="muted">
                          {' '}
                          · {c.izin} izin · {c.sakit} sakit · {c.alpa} alpa
                        </span>
                      )}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
