import { Request, Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma'
import { logError } from '../utils/logger'

type AuditRule = {
  summary: string
  entityType: string
  // true = isi permintaan tidak disimpan (mis. isi catatan murabbi yang bersifat pribadi)
  omitBody?: boolean
}

// Kunci: "METHOD /api/<prefix><route path>". Hanya aksi pengurus yang dicatat;
// aktivitas pribadi (mutaba'ah sendiri, check-in, login) tidak masuk log.
const RULES: Record<string, AuditRule> = {
  'PATCH /api/users/:id/roles': { summary: 'Ubah role user', entityType: 'user' },
  'POST /api/users/:id/reset-password': { summary: 'Reset password user', entityType: 'user' },
  'PATCH /api/users/:id/status': { summary: 'Ubah status aktif user', entityType: 'user' },

  'POST /api/groups': { summary: 'Buat halaqoh', entityType: 'group' },
  'PATCH /api/groups/:id': { summary: 'Ubah halaqoh', entityType: 'group' },
  'DELETE /api/groups/:id': { summary: 'Hapus halaqoh', entityType: 'group' },
  'POST /api/groups/:groupId/members': { summary: 'Tambah anggota halaqoh', entityType: 'group' },
  'PATCH /api/groups/:groupId/members/:userId': { summary: 'Ubah peran anggota halaqoh', entityType: 'group' },
  'DELETE /api/groups/:groupId/members/:userId': { summary: 'Keluarkan anggota halaqoh', entityType: 'group' },
  'POST /api/groups/:groupId/activities': { summary: 'Tambah amalan halaqoh', entityType: 'group' },
  'PATCH /api/groups/:groupId/activities/:activityId': { summary: 'Ubah amalan halaqoh', entityType: 'group' },
  'DELETE /api/groups/:groupId/activities/:activityId': { summary: 'Lepas amalan halaqoh', entityType: 'group' },
  'POST /api/groups/:groupId/apply-template': { summary: 'Pasang template amalan', entityType: 'group' },
  'POST /api/groups/:groupId/meetings': { summary: 'Buat pertemuan halaqoh', entityType: 'group' },
  'POST /api/groups/:groupId/notes': { summary: 'Tulis catatan murabbi', entityType: 'group', omitBody: true },

  'PATCH /api/notes/:id': { summary: 'Ubah catatan murabbi', entityType: 'note', omitBody: true },
  'DELETE /api/notes/:id': { summary: 'Hapus catatan murabbi', entityType: 'note' },

  'POST /api/templates': { summary: 'Buat template amalan', entityType: 'template' },
  'PATCH /api/templates/:id': { summary: 'Ubah template amalan', entityType: 'template' },
  'DELETE /api/templates/:id': { summary: 'Hapus template amalan', entityType: 'template' },

  'POST /api/kajian': { summary: 'Buat kajian', entityType: 'kajian' },
  'PATCH /api/kajian/:id': { summary: 'Ubah kajian', entityType: 'kajian' },
  'DELETE /api/kajian/:id': { summary: 'Hapus kajian', entityType: 'kajian' },
  'POST /api/kajian/:id/meetings': { summary: 'Buat pertemuan kajian', entityType: 'kajian' },

  'PATCH /api/meetings/:id': { summary: 'Ubah pertemuan', entityType: 'meeting' },
  'DELETE /api/meetings/:id': { summary: 'Hapus pertemuan', entityType: 'meeting' },
  'PUT /api/meetings/:id/attendance': { summary: 'Simpan absensi', entityType: 'meeting' },
  'DELETE /api/meetings/:id/attendance/:userId': { summary: 'Hapus data kehadiran', entityType: 'meeting' },

  'POST /api/finance/accounts': { summary: 'Buat kas', entityType: 'financeAccount' },
  'PATCH /api/finance/accounts/:id': { summary: 'Ubah kas', entityType: 'financeAccount' },
  'DELETE /api/finance/accounts/:id': { summary: 'Hapus kas', entityType: 'financeAccount' },
  'POST /api/finance/accounts/:id/transactions': { summary: 'Catat transaksi', entityType: 'financeAccount' },
  'PATCH /api/finance/transactions/:id': { summary: 'Ubah transaksi', entityType: 'transaction' },
  'DELETE /api/finance/transactions/:id': { summary: 'Hapus transaksi', entityType: 'transaction' },
  'POST /api/finance/accounts/:id/dues': { summary: 'Buat iuran', entityType: 'financeAccount' },
  'PATCH /api/finance/dues/:planId': { summary: 'Ubah iuran', entityType: 'duesPlan' },
  'DELETE /api/finance/dues/:planId': { summary: 'Hapus iuran', entityType: 'duesPlan' },
  'POST /api/finance/dues/:planId/payments': { summary: 'Catat pembayaran iuran', entityType: 'duesPlan' },
  'DELETE /api/finance/dues/:planId/payments': { summary: 'Batalkan pembayaran iuran', entityType: 'duesPlan' },

  'POST /api/programs': { summary: 'Buat program', entityType: 'program' },
  'PATCH /api/programs/:id': { summary: 'Ubah program', entityType: 'program' },
  'DELETE /api/programs/:id': { summary: 'Hapus program', entityType: 'program' },
  'POST /api/programs/:id/participants': { summary: 'Tambah peserta program', entityType: 'program' },
  'PATCH /api/programs/:id/participants/:userId': { summary: 'Ubah peran peserta program', entityType: 'program' },
  'DELETE /api/programs/:id/participants/:userId': { summary: 'Keluarkan peserta program', entityType: 'program' },
}

const SENSITIVE_KEY = /password|token|secret/i

const sanitize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !SENSITIVE_KEY.test(key))
        .map(([key, v]) => [key, sanitize(v)])
    )
  }
  return value
}

const firstInt = (...values: unknown[]): number | null => {
  for (const v of values) {
    const n = typeof v === 'number' ? v : parseInt(String(v ?? ''))
    if (Number.isInteger(n)) return n
  }
  return null
}

// Pasang sebelum router. Pencatatan dilakukan setelah respons sukses terkirim,
// saat req.user (dari authenticate) dan req.route sudah terisi.
export const auditTrail = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'GET') {
    next()
    return
  }

  let createdId: number | null = null
  const originalJson = res.json.bind(res)
  res.json = (body: any) => {
    if (body && typeof body === 'object' && typeof body.id === 'number') createdId = body.id
    return originalJson(body)
  }

  res.on('finish', () => {
    if (res.statusCode >= 400 || !req.user || !req.route) return

    const routePath = `${req.baseUrl}${req.route.path === '/' ? '' : req.route.path}`
    const action = `${req.method} ${routePath}`
    const rule = RULES[action]
    if (!rule) return

    const params = req.params as Record<string, string>
    const entityId =
      firstInt(params.id, params.groupId, params.planId) ?? (req.method === 'POST' ? createdId : null)

    const metadata = {
      params,
      ...(Object.keys(req.query).length ? { query: sanitize(req.query) } : {}),
      ...(rule.omitBody ? {} : { body: sanitize(req.body) }),
      ...(createdId !== null && createdId !== entityId ? { resultId: createdId } : {}),
    }

    prisma.auditLog
      .create({
        data: {
          actorId: req.user.userId,
          action,
          summary: rule.summary,
          method: req.method,
          path: req.originalUrl.split('?')[0].slice(0, 500),
          entityType: rule.entityType,
          entityId,
          metadata: metadata as any,
          ip: req.ip ?? null,
        },
      })
      .catch((error) => logError('audit.auditTrail', error))
  })

  next()
}
