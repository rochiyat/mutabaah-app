import type { Role } from '@/types'
import type { IconName } from '@/components/ui/Icon'
import { canCreateGroupRole, canManageUsersRole, isManagerRole } from '@/utils/labels'

export interface MenuItem {
  path: string
  label: string
  // Label pendek untuk menu bawah di HP
  shortLabel?: string
  icon: IconName
}

const MENU: MenuItem[] = [
  { path: '/dashboard', label: 'Dashboard', shortLabel: 'Beranda', icon: 'dashboard' },
  { path: '/activities', label: 'Aktivitas', icon: 'checklist' },
  { path: '/stats', label: 'Statistik', icon: 'chart' },
  { path: '/kalender', label: 'Kalender Hijriah', shortLabel: 'Kalender', icon: 'calendar' },
  { path: '/halaqoh', label: 'Halaqoh', icon: 'users' },
  { path: '/kajian', label: 'Kajian', icon: 'book' },
  { path: '/laporan', label: 'Laporan', icon: 'report' },
  { path: '/keuangan', label: 'Keuangan', icon: 'wallet' },
  { path: '/program', label: 'Program', icon: 'flag' },
]

// Menu sesuai peran user (dipakai sidebar desktop & menu bawah HP)
export const menuFor = (roles?: Role[]): MenuItem[] => [
  ...MENU,
  ...(canCreateGroupRole(roles)
    ? [{ path: '/template-amalan', label: 'Template Amalan', icon: 'layers' as IconName }]
    : []),
  ...(canManageUsersRole(roles) ? [{ path: '/users', label: 'Kelola User', icon: 'shield' as IconName }] : []),
  ...(isManagerRole(roles)
    ? [{ path: '/log-aktivitas', label: 'Log Aktivitas', icon: 'history' as IconName }]
    : []),
]

// Menu yang selalu tampil di bar bawah HP; sisanya masuk panel "Lainnya"
export const MOBILE_PRIMARY_PATHS = ['/dashboard', '/activities', '/halaqoh', '/kalender']

export const isActivePath = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`)
