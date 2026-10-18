import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { UserMutabaahReport } from '@/types'
import { reportAPI } from '@/services/api'
import { getErrorMessage } from '@/utils/labels'
import { defaultPeriod } from '@/utils/period'
import { PeriodPicker } from '@/components/reports/PeriodPicker'
import { ReportToolbar } from '@/components/reports/ReportToolbar'
import { UserMutabaahView } from '@/components/reports/UserMutabaahView'
import { MurabbiNotes } from '@/components/notes/MurabbiNotes'

export const MemberReportPage: React.FC = () => {
  const { userId } = useParams()
  const [params, setParams] = useSearchParams()
  const fallback = useMemo(defaultPeriod, [])
  const groupId = Number(params.get('groupId')) || undefined
  const start = params.get('start') || fallback.start
  const end = params.get('end') || fallback.end

  const [report, setReport] = useState<UserMutabaahReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setIsLoading(true)
    reportAPI
      .userMutabaah(Number(userId), { start, end }, groupId)
      .then((response) => {
        setReport(response.data)
        setError('')
      })
      .catch((err) => setError(getErrorMessage(err, 'Gagal memuat laporan')))
      .finally(() => setIsLoading(false))
  }, [userId, groupId, start, end])

  const changePeriod = (p: { start: string; end: string }) => {
    const next = new URLSearchParams(params)
    next.set('start', p.start)
    next.set('end', p.end)
    setParams(next, { replace: true })
  }

  return (
    <div className="activity-list report-page">
      <p className="no-print">
        <Link to={`/laporan?tab=mutabaah${groupId ? `&id=${groupId}` : ''}&start=${start}&end=${end}`}>
          &larr; Rekap halaqoh
        </Link>
      </p>
      <div className="page-header">
        <h2>
          Laporan Mutabaah{report ? ` — ${report.user.name}` : ''}
          {report?.group && <span className="muted th-sub"> · {report.group.name}</span>}
        </h2>
        <ReportToolbar
          onDownload={() =>
            reportAPI.download(`users/${userId}/mutabaah`, { start, end }, { groupId })
          }
        />
      </div>
      <div className="report-controls no-print">
        <PeriodPicker start={start} end={end} onChange={changePeriod} />
      </div>
      <p className="print-only">
        Periode {start} s.d. {end}
      </p>

      {error && <div className="error">{error}</div>}
      {isLoading ? <div className="loading">Memuat...</div> : report && <UserMutabaahView report={report} />}

      {groupId && (
        <MurabbiNotes groupId={groupId} memberId={Number(userId)} memberName={report?.user.name} />
      )}
    </div>
  )
}
