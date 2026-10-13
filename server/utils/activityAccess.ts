import { prisma } from './prisma'

// Id halaqoh aktif tempat user menjadi anggota (murabbi maupun mutarabbi)
const getActiveGroupIds = async (userId: number): Promise<number[]> => {
  const memberships = await prisma.groupMember.findMany({
    where: { userId, group: { isActive: true } },
    select: { groupId: true },
  })
  return memberships.map((m) => m.groupId)
}

// Amalan yang berlaku untuk user: amalan pribadi + amalan semua halaqoh yang dia ikuti
export const getUserActivities = async (
  userId: number,
  options: { onlyActive?: boolean } = {}
) => {
  const activeFilter = options.onlyActive ? { isActive: true } : {}

  const personal = await prisma.activity.findMany({
    where: { userId, ...activeFilter },
    orderBy: { createdAt: 'desc' },
  })

  const groupIds = await getActiveGroupIds(userId)
  const groupLinks = groupIds.length
    ? await prisma.groupActivity.findMany({
        where: { groupId: { in: groupIds }, activity: activeFilter },
        include: { activity: true, group: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      })
    : []

  // Satu amalan bisa dipakai beberapa halaqoh; tampilkan sekali, wajib jika wajib di salah satunya
  const groupActivities = new Map<
    number,
    (typeof groupLinks)[number]['activity'] & {
      isGroupActivity: true
      isRequired: boolean
      groups: { id: number; name: string }[]
    }
  >()
  for (const link of groupLinks) {
    const existing = groupActivities.get(link.activityId)
    if (existing) {
      existing.isRequired = existing.isRequired || link.isRequired
      existing.groups.push(link.group)
    } else {
      groupActivities.set(link.activityId, {
        ...link.activity,
        isGroupActivity: true,
        isRequired: link.isRequired,
        groups: [link.group],
      })
    }
  }

  return [
    ...personal.map((a) => ({
      ...a,
      isGroupActivity: false,
      isRequired: false,
      groups: [] as { id: number; name: string }[],
    })),
    ...groupActivities.values(),
  ]
}

// Apakah user boleh mencatat amalan ini (milik sendiri, atau amalan halaqohnya)
export const canRecordActivity = async (
  userId: number,
  activityId: number
): Promise<boolean> => {
  const activity = await prisma.activity.findUnique({ where: { id: activityId } })
  if (!activity || !activity.isActive) return false
  if (activity.userId === userId) return true
  if (activity.userId !== null) return false

  const groupIds = await getActiveGroupIds(userId)
  if (!groupIds.length) return false

  const link = await prisma.groupActivity.findFirst({
    where: { activityId, groupId: { in: groupIds } },
  })
  return !!link
}
