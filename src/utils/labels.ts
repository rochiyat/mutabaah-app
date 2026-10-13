import type { AttendanceStatus, GroupMemberRole, Role } from '@/types'

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin (Pengurus)',
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
