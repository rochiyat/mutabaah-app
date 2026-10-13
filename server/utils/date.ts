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
