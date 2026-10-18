import { Request, Response } from 'express'
import { prisma } from '../utils/prisma'
import { CreateRecordDTO, UpdateRecordDTO } from '../types'
import { canRecordActivity } from '../utils/activityAccess'
import { dateKeyToDb, isDateKey, isNotFutureDate, localDateKey } from '../utils/date'
import { logError } from '../utils/logger'

export const getRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' })
      return
    }

    const { activityId, startDate, endDate } = req.query

    const whereClause: any = { userId: req.user.userId }
    
    if (activityId) {
      whereClause.activityId = parseInt(activityId as string)
    }
    
    if (startDate || endDate) {
      whereClause.date = {}
      if (isDateKey(startDate)) {
        whereClause.date.gte = dateKeyToDb(startDate)
      }
      if (isDateKey(endDate)) {
        whereClause.date.lte = dateKeyToDb(endDate)
      }
    }

    const records = await prisma.record.findMany({
      where: whereClause,
      include: { activity: true },
      orderBy: { date: 'desc' }
    })

    res.json(records)
  } catch (error) {
    logError('recordController.getRecords', error)
    res.status(500).json({ message: 'Gagal mengambil catatan' })
  }
}

export const createRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' })
      return
    }

    const { activityId, completed, notes, date } = req.body as CreateRecordDTO

    if (date !== undefined && !isDateKey(date)) {
      res.status(400).json({ message: 'Format tanggal harus yyyy-MM-dd' })
      return
    }

    if (date !== undefined && !isNotFutureDate(date)) {
      res.status(400).json({ message: 'Laporan tidak bisa diisi untuk tanggal yang akan datang' })
      return
    }

    if (!Number.isInteger(completed) || completed < 0) {
      res.status(400).json({ message: 'Jumlah harus bilangan bulat >= 0' })
      return
    }

    if (!(await canRecordActivity(req.user.userId, activityId))) {
      res.status(404).json({ message: 'Aktivitas tidak ditemukan' })
      return
    }

    const record = await prisma.record.create({
      data: {
        activityId,
        completed,
        notes,
        date: dateKeyToDb(date ?? localDateKey()),
        userId: req.user.userId
      },
      include: { activity: true }
    })

    res.status(201).json(record)
  } catch (error: any) {
    logError('recordController.createRecord', error)
    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Catatan untuk tanggal ini sudah ada' })
    } else {
      res.status(500).json({ message: 'Gagal membuat catatan' })
    }
  }
}

export const updateRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' })
      return
    }

    const { id } = req.params
    const { completed, notes } = req.body as UpdateRecordDTO

    if (completed !== undefined && (!Number.isInteger(completed) || completed < 0)) {
      res.status(400).json({ message: 'Jumlah harus bilangan bulat >= 0' })
      return
    }

    const record = await prisma.record.findUnique({ where: { id: parseInt(id) } })
    if (!record || record.userId !== req.user.userId) {
      res.status(404).json({ message: 'Catatan tidak ditemukan' })
      return
    }

    const updated = await prisma.record.update({
      where: { id: parseInt(id) },
      data: { completed, notes },
      include: { activity: true }
    })

    res.json(updated)
  } catch (error) {
    logError('recordController.updateRecord', error)
    res.status(500).json({ message: 'Gagal mengupdate catatan' })
  }
}

export const deleteRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' })
      return
    }

    const { id } = req.params
    const record = await prisma.record.findUnique({ where: { id: parseInt(id) } })
    
    if (!record || record.userId !== req.user.userId) {
      res.status(404).json({ message: 'Catatan tidak ditemukan' })
      return
    }

    await prisma.record.delete({ where: { id: parseInt(id) } })
    res.json({ message: 'Catatan berhasil dihapus' })
  } catch (error) {
    logError('recordController.deleteRecord', error)
    res.status(500).json({ message: 'Gagal menghapus catatan' })
  }
}
