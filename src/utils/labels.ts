import type { AttendanceStatus, GroupMemberRole, ProgramStatus, Role } from '@/types'

export const ALL_ROLES: Role[] = ['murabbi', 'bendahara', 'operator', 'admin', 'superadmin']

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin (Pengurus)',
  operator: 'Operator (PJ Aplikasi)',
  bendahara: 'Bendahara',
  murabbi: 'Murabbi',
}

// ["murabbi","bendahara"] -> "Murabbi, Bendahara"; [] -> "Anggota"
export const formatRoles = (roles: Role[]): string =>
  roles.length ? ALL_ROLES.filter((r) => roles.includes(r)).map((r) => ROLE_LABELS[r]).join(', ') : 'Anggota'

export const MEMBER_ROLE_LABELS: Record<GroupMemberRole, string> = {
  murabbi: 'Murabbi',
  mutarabbi: 'Mutarabbi',
}

// Izin dari beberapa role digabung (sama dengan server/utils/roles.ts)
export const hasRole = (roles: Role[] | undefined, ...wanted: Role[]): boolean =>
  !!roles && wanted.some((r) => roles.includes(r))

export const isManagerRole = (roles?: Role[]): boolean => hasRole(roles, 'superadmin', 'admin')

export const canCreateGroupRole = (roles?: Role[]): boolean =>
  isManagerRole(roles) || hasRole(roles, 'murabbi')

// Operator: kelola user, kajian & program lembaga, tanpa akses data halaqoh
export const canManageUsersRole = (roles?: Role[]): boolean =>
  isManagerRole(roles) || hasRole(roles, 'operator')

export const canCreateKajianRole = (roles?: Role[]): boolean =>
  canCreateGroupRole(roles) || hasRole(roles, 'operator')

// Sama dengan assignableRoles di server/utils/roles.ts
export const assignableRolesFor = (roles?: Role[]): Role[] => {
  if (hasRole(roles, 'superadmin')) return ALL_ROLES
  if (hasRole(roles, 'admin')) return ALL_ROLES.filter((r) => r !== 'superadmin')
  if (hasRole(roles, 'operator')) return ['murabbi', 'bendahara']
  return []
}

export const getErrorMessage = (err: unknown, fallback: string): string => {
  const anyErr = err as { response?: { data?: { message?: string } } }
  return anyErr?.response?.data?.message || fallback
}

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['hadir', 'izin', 'sakit', 'alpa']

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  hadir: 'Hadir',
  izin: 'Izin',
  sakit: 'Sakit',
  alpa: 'Alpa',
}

// "2026-10-13" -> "Selasa, 13 Okt 2026" (tanpa geser zona waktu)
export const formatDate = (key: string): string => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const todayKey = (): string => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export const isFinanceManagerRole = (roles?: Role[]): boolean =>
  isManagerRole(roles) || hasRole(roles, 'bendahara')

const moneyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export const formatMoney = (value: number): string => moneyFormatter.format(value)

export const TRANSACTION_CATEGORIES = {
  masuk: ['infaq', 'iuran', 'donasi', 'zakat', 'lainnya'],
  keluar: ['operasional', 'konsumsi', 'program', 'sosial', 'transport', 'lainnya'],
} as const

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  rencana: 'Rencana',
  berjalan: 'Berjalan',
  selesai: 'Selesai',
  batal: 'Batal',
}

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
