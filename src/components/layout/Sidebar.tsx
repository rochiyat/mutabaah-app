import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { canManageUsersRole } from '@/utils/labels'

export const Sidebar: React.FC = () => {
  const location = useLocation()
  const { user } = useAuth()

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  const canManageUsers = canManageUsersRole(user?.role)

  return (
    <aside className="sidebar">
      <ul>
        <li>
          <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
            Dashboard
          </Link>
        </li>
        <li>
          <Link to="/activities" className={isActive('/activities') ? 'active' : ''}>
            Aktivitas
          </Link>
        </li>
        <li>
          <Link to="/stats" className={isActive('/stats') ? 'active' : ''}>
            Statistik
          </Link>
        </li>
        <li>
          <Link to="/halaqoh" className={isActive('/halaqoh') ? 'active' : ''}>
            Halaqoh
          </Link>
        </li>
        <li>
          <Link to="/kajian" className={isActive('/kajian') ? 'active' : ''}>
            Kajian
          </Link>
        </li>
        <li>
          <Link to="/laporan" className={isActive('/laporan') ? 'active' : ''}>
            Laporan
          </Link>
        </li>
        <li>
          <Link to="/keuangan" className={isActive('/keuangan') ? 'active' : ''}>
            Keuangan
          </Link>
        </li>
        <li>
          <Link to="/program" className={isActive('/program') ? 'active' : ''}>
            Program
          </Link>
        </li>
        {canManageUsers && (
          <li>
            <Link to="/users" className={isActive('/users') ? 'active' : ''}>
              Kelola User
            </Link>
          </li>
        )}
      </ul>
    </aside>
  )
}
