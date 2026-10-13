import { prisma } from './prisma'
import { canManageGroup, canManageKajian, canViewGroup } from './roles'

type AuthUser = { userId: number; role: string }

export const findMeetingForAccess = (meetingId: string | number) => {
  const id = typeof meetingId === 'number' ? meetingId : parseInt(meetingId)
  if (Number.isNaN(id)) return Promise.resolve(null)
  return prisma.meeting.findUnique({
    where: { id },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          adminId: true,
          members: { select: { userId: true, role: true } },
        },
      },
      kajian: { select: { id: true, title: true, createdById: true, isActive: true } },
    },
  })
}

type MeetingForAccess = NonNullable<Awaited<ReturnType<typeof findMeetingForAccess>>>

// Pertemuan halaqoh hanya untuk anggota halaqoh; sesi kajian terbuka untuk semua user
export const canViewMeeting = (meeting: MeetingForAccess, user: AuthUser): boolean => {
  if (meeting.group) return canViewGroup(meeting.group, user)
  return !!meeting.kajian
}

export const canManageMeeting = (meeting: MeetingForAccess, user: AuthUser): boolean => {
  if (meeting.group) return canManageGroup(meeting.group, user)
  if (meeting.kajian) return canManageKajian(meeting.kajian, user)
  return false
}
