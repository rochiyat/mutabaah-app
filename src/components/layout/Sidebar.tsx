import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { canCreateGroupRole, canManageUsersRole, isManagerRole } from '@/utils/labels'
import { Icon, IconName } from '@/components/ui/Icon'

const MENU: { path: string; label: string; icon: IconName }[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/activities', label: 'Aktivitas', icon: 'checklist' },
  { path: '/stats', label: 'Statistik', icon: 'chart' },
  { path: '/kalender', label: 'Kalender Hijriah', icon: 'calendar' },
  { path: '/halaqoh', label: 'Halaqoh', icon: 'users' },
  { path: '/kajian', label: 'Kajian', icon: 'book' },
  { path: '/laporan', label: 'Laporan', icon: 'report' },
  { path: '/keuangan', label: 'Keuangan', icon: 'wallet' },
  { path: '/program', label: 'Program', icon: 'flag' },
]

export const Sidebar: React.FC = () => {
  const location = useLocation()
  const { user } = useAuth()

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  const items = [
    ...MENU,
    ...(canCreateGroupRole(user?.roles)
      ? [{ path: '/template-amalan', label: 'Template Amalan', icon: 'layers' as IconName }]
      : []),
    ...(canManageUsersRole(user?.roles)
      ? [{ path: '/users', label: 'Kelola User', icon: 'shield' as IconName }]
      : []),
    ...(isManagerRole(user?.roles)
      ? [{ path: '/log-aktivitas', label: 'Log Aktivitas', icon: 'history' as IconName }]
      : []),
  ]

  return (
    <aside className="sidebar">
      <ul>
        {items.map((item) => (
          <li key={item.path}>
            <Link to={item.path} className={isActive(item.path) ? 'active' : ''}>
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        <p className="sidebar-quote">"Sedikit tapi istiqamah."</p>
      </div>
    </aside>
  )
}
