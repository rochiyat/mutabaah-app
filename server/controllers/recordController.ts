import { Request, Response } from 'express'
import { prisma } from '../utils/prisma'
import { CreateRecordDTO, UpdateRecordDTO } from '../types'

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
      if (startDate) {
        whereClause.date.gte = new Date(startDate as string)
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate as string)
      }
    }

    const records = await prisma.record.findMany({
      where: whereClause,
      include: { activity: true },
      orderBy: { date: 'desc' }
    })

    res.json(records)
  } catch (error) {
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

    const activity = await prisma.activity.findUnique({ where: { id: activityId } })
    if (!activity || activity.userId !== req.user.userId) {
      res.status(404).json({ message: 'Aktivitas tidak ditemukan' })
      return
    }

    const record = await prisma.record.create({
      data: {
        activityId,
        completed,
        notes,
        date: date ? new Date(date) : new Date(),
        userId: req.user.userId
      },
      include: { activity: true }
    })

    res.status(201).json(record)
  } catch (error: any) {
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
    res.status(500).json({ message: 'Gagal menghapus catatan' })
  }
}
