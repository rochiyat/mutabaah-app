export const ROLES = ['superadmin', 'admin', 'murabbi', 'user'] as const

export type Role = (typeof ROLES)[number]

export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value)

// superadmin & admin (pengurus) bisa mengelola semua grup dan user
export const isManager = (role: string): boolean =>
  role === 'superadmin' || role === 'admin'

// Yang boleh membuat grup/halaqoh baru
export const canCreateGroup = (role: string): boolean =>
  isManager(role) || role === 'murabbi'

// Peran di dalam halaqoh (berbeda dengan role akun)
export const GROUP_MEMBER_ROLES = ['murabbi', 'mutarabbi'] as const

export type GroupMemberRole = (typeof GROUP_MEMBER_ROLES)[number]

export const isGroupMemberRole = (value: unknown): value is GroupMemberRole =>
  typeof value === 'string' && (GROUP_MEMBER_ROLES as readonly string[]).includes(value)

type GroupWithMembers = {
  adminId: number
  members: { userId: number; role: string }[]
}

export const isGroupMember = (group: GroupWithMembers, userId: number): boolean =>
  group.adminId === userId || group.members.some((m) => m.userId === userId)

// Murabbi penanggung jawab, murabbi pendamping, atau pengurus (admin/superadmin)
export const canManageGroup = (
  group: GroupWithMembers,
  user: { userId: number; role: string }
): boolean =>
  group.adminId === user.userId ||
  isManager(user.role) ||
  group.members.some((m) => m.userId === user.userId && m.role === 'murabbi')

export const canViewGroup = (
  group: GroupWithMembers,
  user: { userId: number; role: string }
): boolean => isGroupMember(group, user.userId) || canManageGroup(group, user)

// Kajian rutin: dibuat oleh pengurus atau murabbi, dikelola pembuatnya atau pengurus
export const canCreateKajian = canCreateGroup

export const canManageKajian = (
  kajian: { createdById: number | null },
  user: { userId: number; role: string }
): boolean => kajian.createdById === user.userId || isManager(user.role)

export const ATTENDANCE_STATUSES = ['hadir', 'izin', 'sakit', 'alpa'] as const

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]
