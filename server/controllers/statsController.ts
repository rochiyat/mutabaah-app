import { Request, Response } from 'express'
import { prisma } from '../utils/prisma'
import { addDays, startOfWeek, startOfMonth, endOfMonth, differenceInCalendarDays, subDays } from 'date-fns'
import { getUserActivities } from '../utils/activityAccess'
import { dateKeyToDb, localDateKey, toDateKey } from '../utils/date'

const STREAK_LOOKBACK_DAYS = 366

// Streak = jumlah hari berturut-turut user mengisi mutabaah (minimal satu amalan > 0).
// Jika hari ini belum diisi, hitungan dimulai dari kemarin agar streak tidak putus di pagi hari.
const calculateStreak = async (userId: number): Promise<number> => {
  const today = new Date()
  const records = await prisma.record.findMany({
    where: {
      userId,
      completed: { gt: 0 },
      date: { gte: dateKeyToDb(localDateKey(subDays(today, STREAK_LOOKBACK_DAYS))) },
    },
    select: { date: true },
  })
  const filledDays = new Set(records.map((r) => toDateKey(r.date)))

  let cursor = filledDays.has(localDateKey(today)) ? today : subDays(today, 1)
  let streak = 0
  while (filledDays.has(localDateKey(cursor))) {
    streak++
    cursor = subDays(cursor, 1)
  }
  return streak
}

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Tidak autentik' })
      return
    }

    const userId = req.user.userId
    const activities = await getUserActivities(userId, { onlyActive: true })

    const todayRecords = await prisma.record.findMany({
      where: {
        userId,
        date: dateKeyToDb(localDateKey()),
        activityId: { in: activities.map((a) => a.id) },
      },
    })

    // Kelebihan dari target tidak dihitung, supaya capaian maksimal 100%
    const todayTarget = activities.reduce((sum, act) => sum + act.target, 0)
    const todayCompleted = activities.reduce((sum, act) => {
      const record = todayRecords.find((r) => r.activityId === act.id)
      return sum + Math.min(record?.completed ?? 0, act.target)
    }, 0)

    res.json({
      todayCompleted,
      todayTarget,
      streak: await calculateStreak(userId),
      totalActivities: activities.length,
    })
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

    const userId = req.user.userId
    const start = startOfWeek(new Date(), { weekStartsOn: 1 }) // pekan dimulai Senin
    const days = Array.from({ length: 7 }, (_, i) => localDateKey(addDays(start, i)))

    const activities = await getUserActivities(userId, { onlyActive: true })
    const records = await prisma.record.findMany({
      where: {
        userId,
        activityId: { in: activities.map((a) => a.id) },
        date: { gte: dateKeyToDb(days[0]), lte: dateKeyToDb(days[6]) },
      },
    })

    const stats = activities.map((activity) => ({
      activityId: activity.id,
      activityName: activity.name,
      data: days.map((day) => {
        const record = records.find(
          (r) => r.activityId === activity.id && toDateKey(r.date) === day
        )
        return { date: day, completed: record?.completed ?? 0, target: activity.target }
      }),
    }))

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

    const userId = req.user.userId
    const today = new Date()
    const start = startOfMonth(today)
    const end = endOfMonth(today)
    // Target dihitung sampai hari ini (bukan sebulan penuh) agar persentase capaian akurat di tengah bulan
    const daysElapsed = differenceInCalendarDays(today, start) + 1

    const activities = await getUserActivities(userId, { onlyActive: true })
    const totals = await prisma.record.groupBy({
      by: ['activityId'],
      where: {
        userId,
        activityId: { in: activities.map((a) => a.id) },
        date: { gte: dateKeyToDb(localDateKey(start)), lte: dateKeyToDb(localDateKey(end)) },
      },
      _sum: { completed: true },
    })

    const stats = activities.map((activity) => {
      const totalCompleted =
        totals.find((t) => t.activityId === activity.id)?._sum.completed ?? 0
      const totalTarget = activity.target * daysElapsed
      const percentage =
        totalTarget > 0 ? Math.min((totalCompleted / totalTarget) * 100, 100) : 0

      return {
        activityId: activity.id,
        activityName: activity.name,
        totalCompleted,
        totalTarget,
        percentage,
      }
    })

    res.json(stats)
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil statistik bulanan' })
  }
}
