import React from 'react'
import { Link } from 'react-router-dom'
import type { AttendanceReport } from '@/types'
import { ATTENDANCE_LABELS, MEMBER_ROLE_LABELS, formatDate } from '@/utils/labels'
import { Progress } from './Progress'

const CODES = { hadir: 'H', izin: 'I', sakit: 'S', alpa: 'A' } as const

export const AttendanceView: React.FC<{ report: AttendanceReport; isKajian?: boolean }> = ({
  report,
  isKajian,
}) => {
  const { meetings, members, summary } = report

  if (meetings.length === 0) {
    return <p className="muted">Tidak ada pertemuan dalam periode ini.</p>
  }

  return (
    <>
      <div className="stats-grid report-cards">
        <div className="count-card">
          <span>Pertemuan</span>
          <strong>{summary.meetingCount}</strong>
        </div>
        <div className="count-card">
          <span>{isKajian ? 'Peserta' : 'Anggota'}</span>
          <strong>{summary.participantCount}</strong>
        </div>
        <div className="count-card">
          <span>Rata-rata kehadiran</span>
          <strong>{summary.avgPercent === null ? '-' : `${summary.avgPercent}%`}</strong>
        </div>
      </div>

      <h3 className="report-subtitle">Rekap per {isKajian ? 'peserta' : 'anggota'}</h3>
      <div className="table-wrap">
        <table className="table report-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nama</th>
              <th>Hadir</th>
              <th>Izin</th>
              <th>Sakit</th>
              <th>Alpa</th>
              {!isKajian && <th>Belum diisi</th>}
              <th>% Hadir</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.userId}>
                <td>{i + 1}</td>
                <td>
                  {m.name}
                  {!isKajian && m.role === 'murabbi' && (
                    <span className="badge">{MEMBER_ROLE_LABELS.murabbi}</span>
                  )}
                  {!isKajian && m.role === null && (
                    <span className="badge badge-muted">Bukan anggota</span>
                  )}
                </td>
                <td>{m.hadir}</td>
                <td>{m.izin}</td>
                <td>{m.sakit}</td>
                <td>{m.alpa}</td>
                {!isKajian && <td>{m.belum || ''}</td>}
                <td>
                  <Progress percent={m.percent} compact />
                  <span className="muted th-sub">
                    {m.hadir} dari {m.total}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="report-subtitle">Per pertemuan</h3>
      <div className="table-wrap">
        <table className="table report-table matrix">
          <thead>
            <tr>
              <th>Nama</th>
              {meetings.map((mt) => (
                <th key={mt.id} title={mt.topic}>
                  <Link to={`/pertemuan/${mt.id}`}>{mt.date.slice(5).split('-').reverse().join('/')}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId}>
                <td>{m.name}</td>
                {meetings.map((mt) => {
                  const s = m.perMeeting[mt.id]
                  if (s === null) return <td key={mt.id} className="cell-empty" title="Belum diisi">?</td>
                  if (s === 'na' || s === undefined) return <td key={mt.id} className="muted">-</td>
                  return (
                    <td key={mt.id} title={ATTENDANCE_LABELS[s]}>
                      <span className={`status status-${s} status-code`}>{CODES[s]}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted report-note">
        H = hadir, I = izin, S = sakit, A = alpa, ? = belum diisi, - ={' '}
        {isKajian ? 'tidak tercatat' : 'belum menjadi anggota'}.{' '}
        {isKajian
          ? 'Persentase peserta kajian dihitung dari semua sesi dalam periode.'
          : 'Persentase anggota dihitung dari pertemuan sejak ia bergabung.'}
      </p>

      <h3 className="report-subtitle">Daftar pertemuan</h3>
      <div className="table-wrap">
        <table className="table report-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Materi</th>
              <th>Hadir</th>
              <th>Izin</th>
              <th>Sakit</th>
              <th>Alpa</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((mt) => (
              <tr key={mt.id}>
                <td>
                  <Link to={`/pertemuan/${mt.id}`}>{formatDate(mt.date)}</Link>
                </td>
                <td>{mt.topic}</td>
                <td>{mt.counts.hadir}</td>
                <td>{mt.counts.izin}</td>
                <td>{mt.counts.sakit}</td>
                <td>{mt.counts.alpa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
