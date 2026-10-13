import type { GroupMemberRole, Role } from '@/types'

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
