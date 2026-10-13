import { todayKey } from '@/utils/labels'

export type PeriodPreset = 'week' | 'month' | 'lastMonth' | 'custom'

export const PRESET_LABELS: Record<PeriodPreset, string> = {
  week: 'Pekan ini',
  month: 'Bulan ini',
  lastMonth: 'Bulan lalu',
  custom: 'Pilih tanggal',
}

const pad = (n: number) => String(n).padStart(2, '0')
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const presetRange = (preset: Exclude<PeriodPreset, 'custom'>): { start: string; end: string } => {
  const now = new Date()
  if (preset === 'week') {
    // Pekan dimulai Senin, sama dengan statistik
    const offset = (now.getDay() + 6) % 7
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
    return { start: toKey(start), end: toKey(end) }
  }
  const monthShift = preset === 'lastMonth' ? -1 : 0
  const start = new Date(now.getFullYear(), now.getMonth() + monthShift, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + monthShift + 1, 0)
  return { start: toKey(start), end: toKey(end) }
}

export const detectPreset = (start: string, end: string): PeriodPreset => {
  for (const p of ['week', 'month', 'lastMonth'] as const) {
    const r = presetRange(p)
    if (r.start === start && r.end === end) return p
  }
  return 'custom'
}

export const defaultPeriod = () => presetRange('month')

export { todayKey }
