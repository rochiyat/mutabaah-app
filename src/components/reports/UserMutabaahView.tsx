import React from 'react'
import type { UserMutabaahReport } from '@/types'
import { formatDate } from '@/utils/labels'
import { Progress } from './Progress'

export const UserMutabaahView: React.FC<{ report: UserMutabaahReport }> = ({ report }) => {
  const { activities, days, summary, period } = report

  if (activities.length === 0) {
    return <p className="muted">Belum ada amalan aktif.</p>
  }

  return (
    <>
      <div className="stats-grid report-cards">
        <div className="count-card">
          <span>Capaian total</span>
          <strong>{summary.percent === null ? '-' : `${summary.percent}%`}</strong>
        </div>
        <div className="count-card">
          <span>Hari mengisi</span>
          <strong>
            {summary.daysFilled} / {period.daysCounted ?? 0}
          </strong>
        </div>
        <div className="count-card">
          <span>Amalan</span>
          <strong>{activities.length}</strong>
        </div>
      </div>

      <h3 className="report-subtitle">Per amalan</h3>
      <div className="table-wrap">
        <table className="table report-table">
          <thead>
            <tr>
              <th>Amalan</th>
              <th>Target/hari</th>
              <th>Capaian</th>
              <th>Target periode</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((a) => (
              <tr key={a.id}>
                <td>
                  {a.name}
                  {a.isRequired && <span className="badge">Wajib</span>}
                </td>
                <td>
                  {a.target} {a.unit}
                </td>
                <td>{a.completed}</td>
                <td>{a.targetTotal}</td>
                <td>
                  <Progress percent={a.percent} compact />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="report-subtitle">Harian</h3>
      {days.length === 0 ? (
        <p className="muted">Periode ini belum dimulai.</p>
      ) : (
        <div className="table-wrap">
          <table className="table report-table matrix">
            <thead>
              <tr>
                <th>Tanggal</th>
                {activities.map((a) => (
                  <th key={a.id}>
                    {a.name}
                    <div className="muted th-sub">
                      {a.target} {a.unit}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date}>
                  <td>{formatDate(d.date)}</td>
                  {activities.map((a) => {
                    const v = d.values[a.id] ?? 0
                    const cls = v >= a.target ? 'cell-done' : v > 0 ? 'cell-partial' : 'cell-empty'
                    return (
                      <td key={a.id} className={cls}>
                        {v || ''}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
