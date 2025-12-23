import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export const Sidebar: React.FC = () => {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

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
      </ul>
    </aside>
  )
}
