import { format } from 'date-fns'

// Kolom Record.date bertipe DATE dan dibaca Prisma sebagai tengah malam UTC.
// Semua perbandingan tanggal memakai string 'yyyy-MM-dd' agar tidak bergeser karena zona waktu server.

export const toDateKey = (date: Date): string => date.toISOString().slice(0, 10)

export const localDateKey = (date: Date = new Date()): string =>
  format(date, 'yyyy-MM-dd')

export const dateKeyToDb = (key: string): Date => new Date(`${key}T00:00:00.000Z`)

export const isDateKey = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(dateKeyToDb(value).getTime())

// 'yyyy-MM-dd' -> Date lokal tengah malam (untuk aritmetika hari dengan date-fns)
export const parseDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const eachDateKey = (start: string, end: string): string[] => {
  const keys: string[] = []
  for (let d = parseDateKey(start); localDateKey(d) <= end; d.setDate(d.getDate() + 1)) {
    keys.push(localDateKey(d))
  }
  return keys
}

export const minDateKey = (a: string, b: string): string => (a < b ? a : b)

// Laporan susulan boleh untuk tanggal berapa pun yang sudah lewat, tapi tidak untuk tanggal ke depan.
// Toleransi 1 hari karena zona waktu server (mis. UTC di Docker) bisa tertinggal
// dari zona waktu pengguna (WIB/WITA/WIT).
export const isNotFutureDate = (key: string): boolean => {
  const latest = parseDateKey(localDateKey())
  latest.setDate(latest.getDate() + 1)
  return key <= localDateKey(latest)
}
