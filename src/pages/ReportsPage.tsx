import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type {
  AttendanceReport,
  Group,
  GroupMutabaahReport,
  Kajian,
  UserMutabaahReport,
} from '@/types'
import { groupAPI, kajianAPI, reportAPI } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage, isManagerRole } from '@/utils/labels'
import { defaultPeriod } from '@/utils/period'
import { PeriodPicker } from '@/components/reports/PeriodPicker'
import { ReportToolbar } from '@/components/reports/ReportToolbar'
import { GroupMutabaahView } from '@/components/reports/GroupMutabaahView'
import { AttendanceView } from '@/components/reports/AttendanceView'
import { UserMutabaahView } from '@/components/reports/UserMutabaahView'

type Tab = 'saya' | 'mutabaah' | 'kehadiran' | 'kajian'

const TAB_LABELS: Record<Tab, string> = {
  saya: 'Mutabaah Saya',
  mutabaah: 'Mutabaah Halaqoh',
  kehadiran: 'Kehadiran Halaqoh',
  kajian: 'Kehadiran Kajian',
}

type AnyReport =
  | { tab: 'saya'; data: UserMutabaahReport }
  | { tab: 'mutabaah'; data: GroupMutabaahReport }
  | { tab: 'kehadiran' | 'kajian'; data: AttendanceReport }

export const ReportsPage: React.FC = () => {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const fallback = useMemo(defaultPeriod, [])

  const tab = (params.get('tab') as Tab) || 'saya'
  const selectedId = Number(params.get('id')) || null
  const start = params.get('start') || fallback.start
  const end = params.get('end') || fallback.end

  const [groups, setGroups] = useState<Group[]>([])
  const [kajianList, setKajianList] = useState<Kajian[]>([])
  const [report, setReport] = useState<AnyReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const update = (changes: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, String(v))
    }
    setParams(next, { replace: true })
  }

  // Halaqoh & kajian yang boleh dilihat laporannya
  useEffect(() => {
    Promise.all([groupAPI.getGroups(), kajianAPI.getList()])
      .then(([g, k]) => {
        setGroups(
          g.data.filter(
            (x) => x.myRole === 'murabbi' || x.adminId === user?.id || isManagerRole(user?.roles)
          )
        )
        setKajianList(k.data.filter((x) => x.canManage))
      })
      .catch((err) => console.error('Gagal memuat halaqoh/kajian:', err))
  }, [user])

  const options = tab === 'kajian' ? kajianList : tab === 'saya' ? [] : groups
  const effectiveId =
    tab === 'saya' ? null : selectedId ?? (options.length ? options[0].id : null)

  useEffect(() => {
    if (!user) return
    if (tab !== 'saya' && !effectiveId) {
      setReport(null)
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError('')
    const period = { start, end }
    const load = async (): Promise<AnyReport> => {
      if (tab === 'saya') return { tab, data: (await reportAPI.userMutabaah(user.id, period)).data }
      if (tab === 'mutabaah')
        return { tab, data: (await reportAPI.groupMutabaah(effectiveId!, period)).data }
      if (tab === 'kehadiran')
        return { tab, data: (await reportAPI.groupAttendance(effectiveId!, period)).data }
      return { tab, data: (await reportAPI.kajianAttendance(effectiveId!, period)).data }
    }
    load()
      .then((r) => !cancelled && setReport(r))
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Gagal memuat laporan')))
      .finally(() => !cancelled && setIsLoading(false))
    return () => {
      cancelled = true
    }
  }, [tab, effectiveId, start, end, user])

  const handleDownload = () => {
    const period = { start, end }
    if (tab === 'saya') return reportAPI.download(`users/${user!.id}/mutabaah`, period)
    if (tab === 'mutabaah') return reportAPI.download(`groups/${effectiveId}/mutabaah`, period)
    if (tab === 'kehadiran') return reportAPI.download(`groups/${effectiveId}/attendance`, period)
    return reportAPI.download(`kajian/${effectiveId}/attendance`, period)
  }

  const visibleTabs: Tab[] = [
    'saya',
    ...(groups.length ? (['mutabaah', 'kehadiran'] as Tab[]) : []),
    ...(kajianList.length ? (['kajian'] as Tab[]) : []),
  ]

  const optionLabel = (o: Group | Kajian) => ('title' in o ? o.title : o.name)
  const selectedOption = options.find((o) => o.id === effectiveId)
  const subject = tab === 'saya' ? user?.name : selectedOption && optionLabel(selectedOption)

  return (
    <div className="activity-list report-page">
      <div className="page-header">
        <h2 className="no-print">Laporan</h2>
        {(tab === 'saya' || effectiveId) && <ReportToolbar onDownload={handleDownload} />}
      </div>

      <div className="tabs no-print">
        {visibleTabs.map((t) => (
          <button
            key={t}
            className={t === tab ? 'selected' : ''}
            onClick={() => update({ tab: t, id: null })}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="report-controls no-print">
        {tab !== 'saya' && (
          <select
            value={effectiveId ?? ''}
            onChange={(e) => update({ id: e.target.value })}
            disabled={options.length === 0}
          >
            {options.length === 0 && <option value="">Tidak ada data</option>}
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {optionLabel(o)}
              </option>
            ))}
          </select>
        )}
        <PeriodPicker start={start} end={end} onChange={(p) => update(p)} />
      </div>

      <div className="print-only report-print-title">
        <h2>
          {TAB_LABELS[tab]}
          {subject ? ` — ${subject}` : ''}
        </h2>
        <p>
          Periode {start} s.d. {end}
        </p>
      </div>

      {error && <div className="error">{error}</div>}

      {isLoading ? (
        <div className="loading">Memuat...</div>
      ) : !report || report.tab !== tab ? (
        tab !== 'saya' && !effectiveId && (
          <p className="muted">Belum ada {tab === 'kajian' ? 'kajian' : 'halaqoh'} yang Anda kelola.</p>
        )
      ) : report.tab === 'saya' ? (
        <UserMutabaahView report={report.data} />
      ) : report.tab === 'mutabaah' ? (
        <GroupMutabaahView report={report.data} />
      ) : (
        <AttendanceView report={report.data} isKajian={report.tab === 'kajian'} />
      )}
    </div>
  )
}
