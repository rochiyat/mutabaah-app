import { Request, Response } from 'express'
import { prisma } from '../utils/prisma'
import { CreateActivityDTO, UpdateActivityDTO } from '../types'

export const getActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' })
      return
    }

    const activities = await prisma.activity.findMany({
      where: { userId: req.user.userId },
      include: { records: true },
      orderBy: { createdAt: 'desc' }
    })

    res.json(activities)
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil aktivitas' })
  }
}

export const createActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' })
      return
    }

    const { name, category, target, unit } = req.body as CreateActivityDTO

    const activity = await prisma.activity.create({
      data: {
        name,
        category,
        target: target || 1,
        unit: unit || 'kali',
        userId: req.user.userId
      }
    })

    res.status(201).json(activity)
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat aktivitas' })
  }
}

export const updateActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' })
      return
    }

    const { id } = req.params
    const { name, category, target, unit, isActive } = req.body as UpdateActivityDTO

    const activity = await prisma.activity.findUnique({ where: { id: parseInt(id) } })
    if (!activity || activity.userId !== req.user.userId) {
      res.status(404).json({ message: 'Aktivitas tidak ditemukan' })
      return
    }

    const updated = await prisma.activity.update({
      where: { id: parseInt(id) },
      data: { name, category, target, unit, isActive }
    })

    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupdate aktivitas' })
  }
}

export const deleteActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' })
      return
    }

    const { id } = req.params
    const activity = await prisma.activity.findUnique({ where: { id: parseInt(id) } })
    
    if (!activity || activity.userId !== req.user.userId) {
      res.status(404).json({ message: 'Aktivitas tidak ditemukan' })
      return
    }

    await prisma.activity.delete({ where: { id: parseInt(id) } })
    res.json({ message: 'Aktivitas berhasil dihapus' })
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus aktivitas' })
  }
}
