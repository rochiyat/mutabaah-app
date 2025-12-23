import { Request, Response } from 'express'
import { prisma } from '../utils/prisma'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' })
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayRecords = await prisma.record.aggregate({
      where: {
        userId: req.user.userId,
        date: { gte: today }
      },
      _sum: { completed: true },
      _count: true
    })

    const activities = await prisma.activity.findMany({
      where: { userId: req.user.userId }
    })

    const todayTarget = activities.reduce((sum, act) => sum + act.target, 0)
    const todayCompleted = todayRecords._sum.completed || 0

    const stats = {
      todayCompleted,
      todayTarget,
      streak: 0,
      totalActivities: activities.length
    }

    res.json(stats)
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil statistik' })
  }
}

export const getWeeklyStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' })
      return
    }

    const today = new Date()
    const start = startOfWeek(today)
    const end = endOfWeek(today)

    const activities = await prisma.activity.findMany({
      where: { userId: req.user.userId }
    })

    const stats = await Promise.all(
      activities.map(async (activity) => {
        const records = await prisma.record.findMany({
          where: {
            activityId: activity.id,
            userId: req.user!.userId,
            date: { gte: start, lte: end }
          }
        })

        const data = []
        for (let i = 0; i < 7; i++) {
          const date = new Date(start)
          date.setDate(date.getDate() + i)
          date.setHours(0, 0, 0, 0)

          const record = records.find(r => {
            const rDate = new Date(r.date)
            rDate.setHours(0, 0, 0, 0)
            return rDate.getTime() === date.getTime()
          })

          data.push({
            date: format(date, 'yyyy-MM-dd'),
            completed: record?.completed || 0,
            target: activity.target
          })
        }

        return {
          activityId: activity.id,
          activityName: activity.name,
          data
        }
      })
    )

    res.json(stats)
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil statistik mingguan' })
  }
}

export const getMonthlyStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' })
      return
    }

    const today = new Date()
    const start = startOfMonth(today)
    const end = endOfMonth(today)

    const activities = await prisma.activity.findMany({
      where: { userId: req.user.userId }
    })

    const stats = await Promise.all(
      activities.map(async (activity) => {
        const records = await prisma.record.aggregate({
          where: {
            activityId: activity.id,
            userId: req.user!.userId,
            date: { gte: start, lte: end }
          },
          _sum: { completed: true }
        })

        const totalCompleted = records._sum.completed || 0
        const daysInMonth = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        const totalTarget = activity.target * daysInMonth
        const percentage = totalTarget > 0 ? (totalCompleted / totalTarget) * 100 : 0

        return {
          activityId: activity.id,
          activityName: activity.name,
          totalCompleted,
          totalTarget,
          percentage
        }
      })
    )

    res.json(stats)
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil statistik bulanan' })
  }
}
