import type { AttendanceStatus, GroupMemberRole, ProgramStatus, Role } from '@/types'

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin (Pengurus)',
  operator: 'Operator (PJ Aplikasi)',
  bendahara: 'Bendahara',
  murabbi: 'Murabbi',
  user: 'Anggota',
}

export const MEMBER_ROLE_LABELS: Record<GroupMemberRole, string> = {
  murabbi: 'Murabbi',
  mutarabbi: 'Mutarabbi',
}

export const isManagerRole = (role?: Role): boolean =>
  role === 'superadmin' || role === 'admin'

export const canCreateGroupRole = (role?: Role): boolean =>
  isManagerRole(role) || role === 'murabbi'

// Operator: kelola user, kajian & program lembaga, tanpa akses data halaqoh
export const canManageUsersRole = (role?: Role): boolean =>
  isManagerRole(role) || role === 'operator'

export const canCreateKajianRole = (role?: Role): boolean =>
  canCreateGroupRole(role) || role === 'operator'

const ALL_ROLES: Role[] = ['user', 'murabbi', 'bendahara', 'operator', 'admin', 'superadmin']

// Sama dengan assignableRoles di server/utils/roles.ts
export const assignableRolesFor = (role?: Role): Role[] => {
  if (role === 'superadmin') return ALL_ROLES
  if (role === 'admin') return ALL_ROLES.filter((r) => r !== 'superadmin')
  if (role === 'operator') return ['user', 'murabbi', 'bendahara']
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

export const isFinanceManagerRole = (role?: Role): boolean =>
  isManagerRole(role) || role === 'bendahara'

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
