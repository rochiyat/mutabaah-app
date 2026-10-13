import React from 'react'
import { Link } from 'react-router-dom'
import type { GroupMutabaahReport } from '@/types'
import { MEMBER_ROLE_LABELS } from '@/utils/labels'
import { Progress } from './Progress'

export const GroupMutabaahView: React.FC<{ report: GroupMutabaahReport }> = ({ report }) => {
  const { period, activities, members, summary } = report
  const days = period.daysCounted ?? 0

  if (activities.length === 0) {
    return <p className="muted">Halaqoh ini belum punya amalan aktif.</p>
  }

  return (
    <>
      <div className="stats-grid report-cards">
        <div className="count-card">
          <span>Anggota</span>
          <strong>{summary.memberCount}</strong>
        </div>
        <div className="count-card">
          <span>Hari dihitung</span>
          <strong>{days}</strong>
        </div>
        <div className="count-card">
          <span>Rata-rata capaian</span>
          <strong>{summary.avgPercent === null ? '-' : `${summary.avgPercent}%`}</strong>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table report-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nama</th>
              <th>Hari mengisi</th>
              {activities.map((a) => (
                <th key={a.id}>
                  {a.name}
                  <div className="muted th-sub">
                    {a.target} {a.unit}/hari{a.isRequired ? ' · wajib' : ''}
                  </div>
                </th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.userId}>
                <td>{i + 1}</td>
                <td>
                  <Link
                    to={`/laporan/anggota/${m.userId}?groupId=${report.group.id}&start=${period.start}&end=${period.end}`}
                  >
                    {m.name}
                  </Link>
                  {m.role === 'murabbi' && <span className="badge">{MEMBER_ROLE_LABELS.murabbi}</span>}
                </td>
                <td>
                  {m.daysFilled} / {days}
                </td>
                {activities.map((a) => (
                  <td key={a.id} title={`${m.perActivity[a.id].completed} dari ${m.perActivity[a.id].target} ${a.unit}`}>
                    <Progress percent={m.perActivity[a.id].percent} compact />
                  </td>
                ))}
                <td>
                  <Progress percent={m.percent} compact />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td></td>
              <td colSpan={2}>
                <strong>Rata-rata</strong>
              </td>
              {activities.map((a) => (
                <td key={a.id}>
                  <Progress percent={a.avgPercent} compact />
                </td>
              ))}
              <td>
                <Progress percent={summary.avgPercent} compact />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="muted report-note">
        Capaian = jumlah yang dicatat (maksimal sebesar target per hari) dibagi target × hari
        dihitung. Hari yang belum terjadi tidak dihitung. Klik nama untuk melihat rincian harian.
      </p>
    </>
  )
}
