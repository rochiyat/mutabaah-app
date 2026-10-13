import { prisma } from './prisma'

// Amalan yang berlaku untuk user: amalan pribadi + amalan grup tempat dia menjadi anggota
export const getUserActivities = async (
  userId: number,
  options: { onlyActive?: boolean } = {}
) => {
  const activeFilter = options.onlyActive ? { isActive: true } : {}

  const personal = await prisma.activity.findMany({
    where: { userId, ...activeFilter },
    orderBy: { createdAt: 'desc' },
  })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { groupId: true, group: { select: { isActive: true } } },
  })

  if (!user?.groupId || !user.group?.isActive) {
    return personal.map((a) => ({ ...a, isGroupActivity: false, isRequired: false }))
  }

  const groupLinks = await prisma.groupActivity.findMany({
    where: { groupId: user.groupId, activity: activeFilter },
    include: { activity: true },
    orderBy: { createdAt: 'desc' },
  })

  return [
    ...personal.map((a) => ({ ...a, isGroupActivity: false, isRequired: false })),
    ...groupLinks.map((ga) => ({
      ...ga.activity,
      isGroupActivity: true,
      isRequired: ga.isRequired,
    })),
  ]
}

// Apakah user boleh mencatat amalan ini (milik sendiri, atau amalan grupnya)
export const canRecordActivity = async (
  userId: number,
  activityId: number
): Promise<boolean> => {
  const activity = await prisma.activity.findUnique({ where: { id: activityId } })
  if (!activity || !activity.isActive) return false
  if (activity.userId === userId) return true
  if (activity.userId !== null) return false

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { groupId: true },
  })
  if (!user?.groupId) return false

  const link = await prisma.groupActivity.findUnique({
    where: { groupId_activityId: { groupId: user.groupId, activityId } },
    include: { group: { select: { isActive: true } } },
  })
  return !!link && link.group.isActive
}
