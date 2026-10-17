export const ROLES = ['superadmin', 'admin', 'operator', 'bendahara', 'murabbi', 'user'] as const

export type Role = (typeof ROLES)[number]

export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value)

// superadmin & admin (pengurus) bisa mengelola semua grup dan user
export const isManager = (role: string): boolean =>
  role === 'superadmin' || role === 'admin'

// Operator: PJ administrasi aplikasi (kelola akun, kajian & program lembaga)
// tanpa akses ke data halaqoh/mutaba'ah anggota
export const isOperator = (role: string): boolean => role === 'operator'

// Yang boleh membuka menu kelola user
export const canManageUsers = (role: string): boolean => isManager(role) || isOperator(role)

// Role yang boleh diberikan/dicabut oleh masing-masing pengelola user
export const assignableRoles = (role: string): readonly Role[] => {
  if (role === 'superadmin') return ROLES
  if (role === 'admin') return ROLES.filter((r) => r !== 'superadmin')
  if (role === 'operator') return ['user', 'murabbi', 'bendahara']
  return []
}

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

// Kajian rutin: dibuat oleh pengurus, operator, atau murabbi; dikelola pembuatnya, pengurus, atau operator
export const canCreateKajian = (role: string): boolean => canCreateGroup(role) || isOperator(role)

// Program lembaga (tanpa halaqoh) mengikuti aturan yang sama dengan kajian
export const canCreateLembagaProgram = canCreateKajian

export const canManageKajian = (
  kajian: { createdById: number | null },
  user: { userId: number; role: string }
): boolean => kajian.createdById === user.userId || canManageUsers(user.role)

export const ATTENDANCE_STATUSES = ['hadir', 'izin', 'sakit', 'alpa'] as const

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

// Keuangan lembaga: superadmin, admin, dan bendahara
export const isFinanceManager = (role: string): boolean =>
  isManager(role) || role === 'bendahara'

export const TRANSACTION_TYPES = ['masuk', 'keluar'] as const

export const PROGRAM_STATUSES = ['rencana', 'berjalan', 'selesai', 'batal'] as const

export const PROGRAM_PARTICIPANT_ROLES = ['panitia', 'peserta'] as const
