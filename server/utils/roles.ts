// Peran tambahan akun. Satu user bisa punya beberapa sekaligus (izinnya digabung);
// user tanpa peran tambahan adalah anggota biasa.
export const ROLES = ['superadmin', 'admin', 'operator', 'bendahara', 'murabbi'] as const

export type Role = (typeof ROLES)[number]

export type Roles = readonly string[]

export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value)

// Nilai kolom JSON `User.roles` -> daftar role valid tanpa duplikat
export const parseRoles = (value: unknown): Role[] =>
  Array.isArray(value) ? ROLES.filter((r) => value.includes(r)) : []

export const hasRole = (roles: Roles, ...wanted: Role[]): boolean =>
  wanted.some((r) => roles.includes(r))

// superadmin & admin (pengurus) bisa mengelola semua grup dan user
export const isManager = (roles: Roles): boolean => hasRole(roles, 'superadmin', 'admin')

// Operator: PJ administrasi aplikasi (kelola akun, kajian & program lembaga)
// tanpa akses ke data halaqoh/mutaba'ah anggota
export const isOperator = (roles: Roles): boolean => hasRole(roles, 'operator')

// Yang boleh membuka menu kelola user
export const canManageUsers = (roles: Roles): boolean => isManager(roles) || isOperator(roles)

// Role yang boleh diberikan/dicabut, gabungan dari semua role yang dimiliki
export const assignableRoles = (roles: Roles): Role[] => {
  if (hasRole(roles, 'superadmin')) return [...ROLES]
  if (hasRole(roles, 'admin')) return ROLES.filter((r) => r !== 'superadmin')
  if (isOperator(roles)) return ['murabbi', 'bendahara']
  return []
}

// User lain boleh dikelola jika semua role-nya masih dalam wewenang kita
export const canManageTarget = (roles: Roles, targetRoles: Roles): boolean => {
  if (!canManageUsers(roles)) return false
  const allowed: readonly string[] = assignableRoles(roles)
  return targetRoles.every((r) => allowed.includes(r))
}

// Yang boleh membuat grup/halaqoh baru
export const canCreateGroup = (roles: Roles): boolean =>
  isManager(roles) || hasRole(roles, 'murabbi')

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
  user: { userId: number; roles: Roles }
): boolean =>
  group.adminId === user.userId ||
  isManager(user.roles) ||
  group.members.some((m) => m.userId === user.userId && m.role === 'murabbi')

export const canViewGroup = (
  group: GroupWithMembers,
  user: { userId: number; roles: Roles }
): boolean => isGroupMember(group, user.userId) || canManageGroup(group, user)

// Kajian rutin: dibuat oleh pengurus, operator, atau murabbi; dikelola pembuatnya, pengurus, atau operator
export const canCreateKajian = (roles: Roles): boolean => canCreateGroup(roles) || isOperator(roles)

// Program lembaga (tanpa halaqoh) mengikuti aturan yang sama dengan kajian
export const canCreateLembagaProgram = canCreateKajian

export const canManageKajian = (
  kajian: { createdById: number | null },
  user: { userId: number; roles: Roles }
): boolean => kajian.createdById === user.userId || canManageUsers(user.roles)

export const ATTENDANCE_STATUSES = ['hadir', 'izin', 'sakit', 'alpa'] as const

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

// Keuangan lembaga: superadmin, admin, dan bendahara
export const isFinanceManager = (roles: Roles): boolean =>
  isManager(roles) || hasRole(roles, 'bendahara')

export const TRANSACTION_TYPES = ['masuk', 'keluar'] as const

export const PROGRAM_STATUSES = ['rencana', 'berjalan', 'selesai', 'batal'] as const

export const PROGRAM_PARTICIPANT_ROLES = ['panitia', 'peserta'] as const
