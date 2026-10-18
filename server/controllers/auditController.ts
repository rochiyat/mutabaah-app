import { Request, Response } from 'express'
import { prisma } from '../utils/prisma'
import { dateKeyToDb, isDateKey } from '../utils/date'
import { logError } from '../utils/logger'

const PAGE_SIZE = 50

// Query: page, actorId, entityType, start, end (yyyy-MM-dd), search (cari di keterangan)
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')) || 1)
    const { actorId, entityType, start, end, search } = req.query

    const where: any = {}
    if (actorId && Number.isInteger(Number(actorId))) where.actorId = Number(actorId)
    if (typeof entityType === 'string' && entityType) where.entityType = entityType
    if (typeof search === 'string' && search.trim()) where.summary = { contains: search.trim() }
    if (isDateKey(start) || isDateKey(end)) {
      where.createdAt = {}
      if (isDateKey(start)) where.createdAt.gte = dateKeyToDb(start)
      if (isDateKey(end)) {
        const next = dateKeyToDb(end)
        next.setUTCDate(next.getUTCDate() + 1)
        where.createdAt.lt = next
      }
    }

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ])

    res.json({ items, total, page, pageSize: PAGE_SIZE })
  } catch (error) {
    logError('auditController.getAuditLogs', error)
    res.status(500).json({ message: 'Gagal mengambil log aktivitas' })
  }
}
