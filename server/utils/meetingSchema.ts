import { z } from 'zod'
import { ATTENDANCE_STATUSES } from './roles'
import { isDateKey } from './date'

const optionalText = z
  .string()
  .trim()
  .max(191)
  .nullable()
  .optional()
  .transform((v) => (v === '' ? null : v))

export const meetingSchema = z.object({
  date: z.string().refine(isDateKey, 'Format tanggal harus yyyy-MM-dd'),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format jam harus HH:mm')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  topic: z.string().trim().min(1, 'Materi / tema wajib diisi').max(191),
  speaker: optionalText,
  location: optionalText,
  notes: z.string().trim().max(5000).nullable().optional(),
})

export const meetingUpdateSchema = meetingSchema.partial()

export const attendanceSchema = z.object({
  entries: z
    .array(
      z.object({
        userId: z.number().int().positive(),
        status: z.enum(ATTENDANCE_STATUSES, {
          errorMap: () => ({ message: 'Status harus hadir, izin, sakit, atau alpa' }),
        }),
        note: z.string().trim().max(191).nullable().optional(),
      })
    )
    .min(1, 'Tidak ada data kehadiran')
    .max(500),
})

export const sendValidationError = (
  res: { status: (code: number) => { json: (body: unknown) => void } },
  error: z.ZodError
): void => {
  res.status(400).json({
    message: error.issues[0].message,
    errors: error.flatten().fieldErrors,
  })
}
