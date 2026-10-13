import { Prisma } from '@prisma/client'
import { z } from 'zod'

// Nominal rupiah: positif, maksimal 2 desimal, < 10 triliun
export const amountSchema = z
  .number({ invalid_type_error: 'Nominal harus berupa angka' })
  .positive('Nominal harus lebih dari 0')
  .max(9_999_999_999_999, 'Nominal terlalu besar')
  .transform((v) => Math.round(v * 100) / 100)

export const toNumber = (value: Prisma.Decimal | number | null | undefined): number =>
  value === null || value === undefined ? 0 : Number(value)

// Jumlahkan hasil groupBy { type, _sum.amount } menjadi { masuk, keluar }
export const sumByType = (
  rows: { type: string; _sum: { amount: Prisma.Decimal | null } }[]
): { masuk: number; keluar: number } => {
  const result = { masuk: 0, keluar: 0 }
  for (const row of rows) {
    if (row.type === 'masuk' || row.type === 'keluar') {
      result[row.type] += toNumber(row._sum.amount)
    }
  }
  return result
}
