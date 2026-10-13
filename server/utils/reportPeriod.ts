import { differenceInCalendarDays, startOfMonth, endOfMonth } from 'date-fns'
import { isDateKey, localDateKey, parseDateKey } from './date'

export const MAX_REPORT_DAYS = 366

export type ReportPeriod = { start: string; end: string }

// Baca ?start=&end= (yyyy-MM-dd); default bulan berjalan
export const parsePeriod = (
  query: Record<string, unknown>
): { period: ReportPeriod } | { error: string } => {
  const now = new Date()
  const start = isDateKey(query.start) ? query.start : localDateKey(startOfMonth(now))
  const end = isDateKey(query.end) ? query.end : localDateKey(endOfMonth(now))

  if (start > end) return { error: 'Tanggal mulai harus sebelum tanggal akhir' }
  if (differenceInCalendarDays(parseDateKey(end), parseDateKey(start)) + 1 > MAX_REPORT_DAYS) {
    return { error: `Periode laporan maksimal ${MAX_REPORT_DAYS} hari` }
  }
  return { period: { start, end } }
}

export const percent = (part: number, whole: number): number | null =>
  whole > 0 ? Math.round((part / whole) * 1000) / 10 : null
